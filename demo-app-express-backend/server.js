const express = require("express");
const { Readable } = require("stream");
const app = express();
const jwt = require("jsonwebtoken");
const sequelize = require('./db'); 
const CsvFile = require('./models/csvfile');
const axios = require("axios");
const qs = require("qs");
const cors = require("cors");

const port = 3002;

// Docker Build Vars
const redirect_uri = process.env.REACT_APP_REDIRECT_URI;
const client_id = process.env.REACT_APP_CLIENT_ID;
const grant_type = "authorization_code";
const client_secret = process.env.CLIENT_SECRET;
const authURL = "https://www.strava.com/api/v3/oauth/token";

app.use(cors());
app.use(express.json());

app.post("/api/open", async (req, res) => {
  const data = req.body;
  try {
    const access_token = await fetchAndProcess(data.code);
    res.json({
      message: "Data received!",
      accessToken: access_token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New route to fetch all CSV files
app.get("/api/csvfiles", async (req, res) => {
  try {
    const csvFiles = await CsvFile.findAll();
    res.json(csvFiles);
  } catch (error) {
    console.error("Error fetching CSV files:", error);
    res.status(500).json({ error: "An error occurred while fetching CSV files." });
  }
});

app.get("/api/csvfiles/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const csvFile = await CsvFile.findOne({ where: { userID: userId } });
    if (csvFile) {
      res.json(csvFile);
    } else {
      res.status(404).json({ error: "CSV file not found for the specified user." });
    }
  } catch (error) {
    console.error("Error fetching CSV file:", error);
    res.status(500).json({ error: "An error occurred while fetching the CSV file." });
  }
});

app.get("/api/csvfiles/:userId/download", async (req, res) => {
  const userId = req.params.userId;
  try {
    const csvFile = await CsvFile.findOne({ where: { userID: userId } });
    if (csvFile) {
      // Set the appropriate headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename="csvfile.csv"');
      res.setHeader('Content-Type', 'text/csv');

      // Send the CSV file content as response
      res.send(csvFile.csvData);
    } else {
      res.status(404).json({ error: "CSV file not found for the specified user." });
    }
  } catch (error) {
    console.error("Error fetching CSV file:", error);
    res.status(500).json({ error: "An error occurred while fetching the CSV file." });
  }
});


/**
 * @param {string} code
 * @returns {string} access_token
 */
async function fetchAndProcess(code) {
  const requestBody = qs.stringify({
    code: code,
    redirect_uri: redirect_uri,
    grant_type: grant_type,
    client_id: client_id,
    client_secret: client_secret,
  });

  try {
    const response = await axios.post(authURL, requestBody);

    console.log("200 OK from Auth Server: ", JSON.stringify(response.data, null, 2));

    const access_token = response.data.access_token;
    const userId = response.data.athlete.id;
    console.log("userId: ", userId);

    // Fetch all activities and save them
    const activityStream = await fetchActivitiesLoop(access_token);
    await saveCSVToDatabase(activityStream, userId);

    return access_token;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("An error occurred while processing the data.");
  }
}

async function fetchActivities(page, access_token) {
  const perPage = 200;
  const url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const data = response.data;

    return data;
  } catch (error) {
    console.error("Error fetching activities:", error);
    throw error;
  }
}

async function saveCSVToDatabase(activityStream, userID) {
  try {
    let csvData = "";
    for await (const chunk of activityStream) {
      csvData += chunk.toString(); // Assuming chunk is a Buffer or string
    }

    // Use findOne and create/update as a fallback for upsert
    const existingRecord = await CsvFile.findOne({ where: { userID } });
    if (existingRecord) {
      existingRecord.csvData = csvData;
      await existingRecord.save();
    } else {
      await CsvFile.create({ userID, csvData });
    }

    console.log("CSV file saved to the database");
  } catch (error) {
    console.error("Error saving CSV to the database:", error);
  }
}

async function fetchActivitiesLoop(access_token) {
  let page = 1;
  const activityStream = new Readable({
    read() {},
  });

  try {
    const csvHeader =
      "name,distance,time,elevation_gain,moving_time,average_heartrate,max_heartrate\n";
    activityStream.push(csvHeader);

    while (true) {
      const activities = await fetchActivities(page, access_token);
      if (activities.length === 0) {
        console.log("No more activities found...writing csv to table");
        break;
      }
      activities.forEach((activity) => {
        let distanceInMiles = metersToMiles(activity.distance);
        let activityData = `${activity.name.replace(/,/g, '')},${distanceInMiles},${activity.start_date},${activity.total_elevation_gain},${activity.moving_time}`;

        if (activity.has_heartrate) {
          activityData += `,${activity.average_heartrate},${activity.max_heartrate}`;
        } else {
          activityData += ",,";
        }
        activityData += "\n";
        activityStream.push(activityData);
      });
      console.log("processed page: " + page);
      page++;
    }
    activityStream.push(null); // End the stream
  } catch (error) {
    console.error("Error fetching activities:", error);
    activityStream.destroy(error);
  }

  return activityStream;
}

function metersToMiles(meters) {
  return meters * 0.000621371;
}

// Sync database and start the server
sequelize.sync().then(() => {
  console.log('Database & tables created!');
  
  app.listen(port, () => {
    console.log(`Express server is running on port ${port}`);
  });
}).catch(error => {
  console.error('Unable to sync database:', error);
});
