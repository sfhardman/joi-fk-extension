const VanillaJoi = require('joi');
const fkExtension = require('../index.js');

const Joi = VanillaJoi.extend(fkExtension);

const modelSchema = Joi.object({
  id: Joi.string(),
  name: Joi.string(),
});

const makeSchema = Joi.object({
  id: Joi.string(),
  alternateIds: Joi.array().items(Joi.string()),  
  name: Joi.string(),
  models: Joi.array().items(modelSchema),
});

const vehiclesSchema = Joi.object({
  vinNumber: Joi.string(),
  makeId: Joi.any().fk([
    'makes.[].id',
    'makes.[].alternateIds.[]',
  ]).required(),
  modelId: Joi.any().fk('makes.[].models.[].id').required(),
});

const carsSchema = Joi.object({
  makes: Joi.array().items(makeSchema),
  vehicles: Joi.array().items(vehiclesSchema),
});

const makes = [
  {
    id: 'nissan',
    alternateIds: [ 'datsun' ],
    name: 'Nissan',
    models: [
      {
        id: '240z',
        name: 'Fairlady',
      },
    ]
  },
  {
    id: 'toyota',
    name: 'Toyota',
    models: [
      {
        id: 'kp60',
        name: 'starlet',
      },  
      {
        id: 'ae101',
        name: 'levin',
      },
    ],
  },    
];

describe('Joi-fk-extension', () => {
  it('passes validation when FK exists', () => {
    const data = {
      makes,
      vehicles: [
        {
          vinNumber: '23-12323-44',
          makeId: 'toyota',
          modelId: 'ae101',
        },
      ],
    };
    const result = Joi.validate(data, carsSchema, { context: data });
    expect(result.error).toBeFalsy();
  });
  it('fails validation when FK does not exist', () => {
    const data = {
      makes,
      vehicles: [
        {
          vinNumber: '23-12323-44',
          makeId: 'toyota',
          modelId: 'ae92',
        },
      ],
    };
    const result = Joi.validate(data, carsSchema, { context: data });
    expect(result.error).toBeTruthy();
    expect(result.error.name).toBe('ValidationError');
  });  
  it('passes validation when alternate FK exists', () => {
    const data = {
      makes,
      vehicles: [
        {
          vinNumber: '23-12323-44',
          makeId: 'datsun',
          modelId: '240z',
        },
      ],
    };
    const result = Joi.validate(data, carsSchema, { context: data });
    expect(result.error).toBeFalsy();
  });  
  it('fails validation when context is not supplied', () => {
    const data = {
      makes,
      vehicles: [
        {
          vinNumber: '23-12323-44',
          makeId: 'toyota',
          modelId: 'ae101',
        },
      ],
    };
    const result = Joi.validate(data, carsSchema);
    expect(result.error).toBeTruthy();
    expect(result.error.name).toBe('ValidationError');
  }); 
});
