'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      Task.belongsTo(models.User);
    }
  }
  Task.init({
    title: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY },
    priority: { type: DataTypes.STRING },
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    customerId: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE }
  }, {
    sequelize,
    modelName: 'Task',
    timestamps: false
  });
  return Task;
};
