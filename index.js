const getNextPath = fkPathChunks => fkPathChunks
  .filter((chunk, index) => index > 0)
  .join('.');

const findFk = (fkValue, fkPath, data) => {
  const fkPathChunks = fkPath.split('.').filter(chunk => !!chunk);
  if (!fkPathChunks.length) {
    return data === fkValue;
  }
  const currentChunk = fkPathChunks[0];
  if (currentChunk === '[]') {
    if (!Array.isArray(data)) {
      return false;
    }
    return data.some(item => findFk(fkValue, getNextPath(fkPathChunks), item));
  }
  if (!(currentChunk in data)) {
    return false;
  }
  return findFk(fkValue, getNextPath(fkPathChunks), data[currentChunk]);
};

const joiFkBaseExtension = (joi, baseType) => ({
  name: baseType,
  base: joi[baseType](),
  language: {
    noContext: 'The data to look for FK references in must be passed in options.context',
    fkNotFound: '"{{value}}" could not be found as a reference to "{{path}}"',
  },  
  rules: [
    {
      name: 'fk',
      params: {
        fkPath: joi.alternatives([
          joi.string(),
          joi.array().items(joi.string()),
        ]).required(),
      },
      validate: (params, value, state, options) => {
        if (!options.context) {
          return joi.createError(`${baseType}.noContext`,
            null, state, options);
        }
        const fkPaths = Array.isArray(params.fkPath) ? params.fkPath : [ params.fkPath ];
        if (!fkPaths.some(fkPath => findFk(value, fkPath, options.context))) {
          return joi.createError(`${baseType}.fkNotFound`,
            { value, path: params.fkPath },
            state, options);
        }
      },
    },
  ],
});

const joiFkExtension = joi => ({
  name: 'any',
  base: joi.any(),
  language: {
    noContext: 'The data to look for FK references in must be passed in options.context',
    fkNotFound: '"{{value}}" could not be found as a reference to "{{path}}"',
  },  
  rules: [
    {
      name: 'fk',
      params: {
        fkPath: joi.alternatives([
          joi.string(),
          joi.array().items(joi.string()),
        ]).required(),
      },
      validate: (params, value, state, options) => {
        if (!options.context) {
          return joi.createError('any.noContext',
            null, state, options);
        }
        const fkPaths = Array.isArray(params.fkPath) ? params.fkPath : [ params.fkPath ];
        if (!fkPaths.some(fkPath => findFk(value, fkPath, options.context))) {
          return joi.createError('any.fkNotFound',
            { value, path: params.fkPath },
            state, options);
        }
      },
    },
  ],
});

const joiFkStringExtension = joi => joiFkBaseExtension(joi, 'string');
const joiFkNumberExtension = joi => joiFkBaseExtension(joi, 'number');


module.exports = {
  fkString: joiFkStringExtension,
  fkNumber: joiFkNumberExtension,
};
