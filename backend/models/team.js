'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    static associate(models) {
      Team.belongsToMany(models.User, { through: 'UserTeam' });
      Team.hasMany(models.Customer);
      Team.hasMany(models.Property);
    }
  }
  Team.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Team',
  });
  return Team;
};
