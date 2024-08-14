const express = require("express");
const { Readable } = require("stream");
const app = express();
const axios = require("axios");
const qs = require("qs");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

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

app.get("/api/csvfiles/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const filePath = path.join(__dirname, `csv_files/${userId}.csv`);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
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
    await saveCSVToFile(activityStream, userId);

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
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error Status:", error.response.status);
      console.error("Error Headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Error Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error Message:", error.message);
    }
    console.error("Error Config:", JSON.stringify(error.config, null, 2));
    
    throw error;
  }
}

async function saveCSVToFile(activityStream, userID) {
  try {
    const directoryPath = path.join(__dirname, 'csv_files');
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }

    const filePath = path.join(directoryPath, `${userID}.csv`);
    const writeStream = fs.createWriteStream(filePath);

    for await (const chunk of activityStream) {
      writeStream.write(chunk.toString()); // Assuming chunk is a Buffer or string
    }

    writeStream.end();

    console.log("CSV file saved locally");
  } catch (error) {
    console.error("Error saving CSV to file:", error);
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
        console.log("No more activities found...writing csv to file");
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

// Start the server
app.listen(port, () => {
  console.log(`Express server is running on port ${port}`);
});
