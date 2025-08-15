'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Property extends Model {
    static associate(models) {
      Property.belongsTo(models.Team);
      Property.hasMany(models.Image);
      Property.hasMany(models.Notification);
    }
  }
  Property.init({
    title: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING },
    transactionType: { type: DataTypes.STRING },
    propertyType: { type: DataTypes.STRING },
    area: { type: DataTypes.INTEGER },
    bedrooms: { type: DataTypes.INTEGER },
    price: { type: DataTypes.BIGINT },
    rahn: { type: DataTypes.BIGINT },
    rent: { type: DataTypes.BIGINT },
    features: { type: DataTypes.JSON },
    description: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE },
    embedding: { type: DataTypes.VECTOR(384) }
  }, {
    sequelize,
    modelName: 'Property',
    timestamps: false,
    indexes: [{
        fields: ['embedding'],
        using: 'hnsw',
        operator: 'vector_cosine_ops'
    }]
  });
  return Property;
};
