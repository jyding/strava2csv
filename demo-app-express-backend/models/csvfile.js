const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // Ensure the correct path to the sequelize instance

const CsvFile = sequelize.define('CsvFile', {
  userID: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  csvData: {
    type: DataTypes.BLOB
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

module.exports = CsvFile;
