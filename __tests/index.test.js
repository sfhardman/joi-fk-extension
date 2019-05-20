const VanillaJoi = require('joi');
const fkExtension = require('../index.js');

const Joi = VanillaJoi
  .extend(fkExtension.fkString)
  .extend(fkExtension.fkNumber);

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
  makeId: Joi.string().fk([
    'makes.[].id',
    'makes.[].alternateIds.[]',
  ]).required(),
  modelId: Joi.string().fk('makes.[].models.[].id').required(),
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

const animalsSchema = Joi.object({
  species: Joi.array().items({
    speciesId: Joi.number().required().tags('PK')
      .description('Unique ID for the species'),
    name: Joi.string().required().max(30),
  }),
  animals: Joi.array().items({
    animalId: Joi.number().required().tags('PK')
     .description('Unique ID for the animal'),
    name: Joi.string().required().max(50),
    speciesId: Joi.number().fk('species.[].speciesId').required()
      .label('Species'),
  }),
});

const species = [
  { speciesId: 1, name: 'Tiger' },
  { speciesId: 2, name: 'Koala' },
  { speciesId: 3, name: 'African Elephant' },
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
    const result = Joi.validate(data, carsSchema, { context: { data } });
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
    const result = Joi.validate(data, carsSchema, { context: { data } });
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
    const result = Joi.validate(data, carsSchema, { context: { data } });
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
  it('handles numeric ids when fk is valid', () => {
    const data = {
      species,
      animals: [
        { animalId: 1, speciesId: 1, name: 'bob '},
      ]
    }
    const result = Joi.validate(data, animalsSchema, { context: { data } });
    expect(result.error).toBeFalsy();
  });
  it('handles numeric ids when fk is not valid', () => {
    const data = {
      species,
      animals: [
        { animalId: 1, speciesId: 11, name: 'bob '},
      ]
    }
    const result = Joi.validate(data, animalsSchema, { context: { data } });
    expect(result.error).toBeTruthy();
    expect(result.error.name).toBe('ValidationError');
  });
  it('performs reasonably', () => {
    const perfSchema = Joi.object({
      parents: Joi.array().items({
        parentId: Joi.string(),
      }),
      links: Joi.array().items({
        from: Joi.string().fk('parents.[].parentId'),
        to: Joi.string().fk('parents.[].parentId'),
      }),
    });
    const data = {
      parents: [],
      links: [],
    };
    const parentItems = 1000;
    for (let i = 0; i < parentItems; i += 1) {
      const id = `${10000* Math.random()}`;
      data.parents.push({
        parentId: id,
      });
    }
    for (let i = 0; i < 1000; i += 1) {
      const parentIndex1 = Math.round(Math.random()*(parentItems-1));
      const parentIndex2 = Math.round(Math.random()*(parentItems-1));
      data.links.push({
        from: data.parents[parentIndex1].parentId,
        to: data.parents[parentIndex2].parentId,
      });      
    }
    const start = new Date();
    const result = Joi.validate(data, perfSchema, { context: { data } });
    const end = new Date();
    const durationMs = end - start;
    expect(result.error).toBeFalsy();
    expect(durationMs).toBeLessThan(500);
  });     
});
