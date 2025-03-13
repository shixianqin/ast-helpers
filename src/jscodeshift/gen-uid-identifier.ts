import j from 'jscodeshift';
import type { ASTPath, Identifier } from 'jscodeshift';

const tempName = '_temp';

function formatName(name?: string) {
  if (typeof name !== 'string') {
    return tempName;
  }

  const segments = name.match(/(\w|_|\$)+/g) || [];

  if (segments.length === 0) {
    return tempName;
  }

  // For safety
  if (segments[0]![0] !== '_') {
    segments[0] = '_' + segments[0];
  }

  return segments
    .map((item) => {
      return item[0].toUpperCase() + item.substring(1);
    })
    .join('');
}

export function genUidIdentifier(path: ASTPath, name?: string): Identifier {
  const _name = formatName(name);

  const collection = j(path);
  const id = j.identifier(_name);

  let count = 1;

  const gen = () => {
    const size = collection
      .find(j.Identifier, {
        name: id.name,
      })
      .size();

    if (size === 0) {
      return id;
    }

    id.name = _name + (count += 1);

    return gen();
  };

  return gen();
}
