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

const getPossibleFks = (fkPath, data) => {
  const fkPathChunks = fkPath.split('.').filter(chunk => !!chunk);
  if (!fkPathChunks.length) {
    return [data];
  }  
  const currentChunk = fkPathChunks[0];
  if (currentChunk === '[]') {
    if (!Array.isArray(data)) {
      return [];
    };
    const result = [];
    data.forEach(item => result.push(...getPossibleFks(getNextPath(fkPathChunks), item)));
    return result;
  }
  if (!(currentChunk in data)) {
    return [];
  }
  return getPossibleFks(getNextPath(fkPathChunks), data[currentChunk]);
};

const createCache = (fkPaths, data) => {
  const result = [];
  fkPaths.forEach(fkPath => result.push(...getPossibleFks(fkPath, data)));
  return result;
};

const joiFkBaseExtension = (joi, baseType) => ({
  name: baseType,
  base: joi[baseType](),
  language: {
    noContext: 'The data to look for FK references in must be passed in options.context.data',
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
        if (!(options && options.context && options.context.data)) {
          return joi.createError(`${baseType}.noContext`,
            null, state, options);
        }
        const fkPaths = Array.isArray(params.fkPath) ? params.fkPath : [ params.fkPath ];
        const cacheKey = fkPaths.join(',');
        options.context._cache = options.context._cache || {};

        if (!options.context._cache[cacheKey]) {
          options.context._cache[cacheKey] = createCache(fkPaths, options.context.data);
        }
        if (!options.context._cache[cacheKey].includes(value)) {
          return joi.createError(`${baseType}.fkNotFound`,
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
