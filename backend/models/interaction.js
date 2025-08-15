'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Interaction extends Model {
    static associate(models) {
      Interaction.belongsTo(models.Customer);
      Interaction.belongsTo(models.User);
    }
  }
  Interaction.init({
    type: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT }
  }, {
    sequelize,
    modelName: 'Interaction',
  });
  return Interaction;
};
