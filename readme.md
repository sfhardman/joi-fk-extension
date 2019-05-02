# Joi-fk-extension

This is an extension for the [Joi](https://github.com/hapijs/joi) validation library that allows validation of foreign key style references to other objects.

Joi offers a built in [ref](https://github.com/hapijs/joi/blob/v15.0.1/API.md#refkey-options) validation, but it cannot traverse arrays to look up references.

## Usage

```js

const VanillaJoi = require('joi');
const joiFkExtension = require('joi-fk-extension');

const Joi = VanillaJoi.extend(joiFkExtension);

const schema = Joi.array().items(
  Joi.object({
    // require that packageId must equal the packageId field 
    // of one of the items in the 'packages' array of the reference data
    packageId: Joi.any().fk('packages.[].packageId'),
  }),
);

const referenceData = {
  packages: [
    { packageId: 'joi' },
    { packageId: 'hapi' },
  ],
};

const pass = Joi.validate([{ packageId: 'hapi' }], schema, { context: referenceData });

console.log(pass.error); // null - no error

const fail = Joi.validate([{ packageId: 'commander' }], schema, { context: referenceData });

console.log(fail.error); //"packageId" "commander" could not be found as a reference to "packages.[].packageId"

```

## API

### `fk(fkPath)`

Requires that the field must refer to a foreign key field referenced by fkPath.

Reference data to search for the reference in must be supplied to Joi in options.context (e.g. in a call to `Joi.validate(data, schema, options)`) 

- `fkPath` - The format of fkPath has dot seperated object fields, with search across an array indicated by a pair of square brackets (`[]`)

e.g.:

```js
const referenceData = {
  species: [
    { speciesId: 'tiger' },
  ],
};

const zooSchema = Joi.object({
  animals: Joi.array().items(Joi.object({
    name: Joi.string(),
    speciesId: Joi.any().fk('species.[].speciesId'),
  })),
});
```

`fkPath` may be an array of possible foreign key paths instead of a string.

e.g.:

```js
const referenceData = {
  species: [
    { speciesId: 'tiger', alternateId: 'panthera tigris' },
  ],
};

const zooSchema = Joi.object({
  animals: Joi.array().items(Joi.object({
    name: Joi.string(),
    speciesId: Joi.any().fk([
      'species.[].speciesId',
      'species.[].alternateId',
    ]),
  })),
});
```