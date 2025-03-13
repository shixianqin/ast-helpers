import j, { type ASTPath, type Program } from 'jscodeshift';
import { genUidIdentifier } from './gen-uid-identifier';

function getProgramPath(path: ASTPath): ASTPath<Program> {
  if (path.node.type === 'File') {
    return j(path).find(j.Program).get();
  }

  while (path) {
    if (path.node.type === 'Program') {
      return path as any;
    }

    path = path.parentPath;
  }

  return path;
}

function getImports(path: ASTPath, source: string) {
  const programPath = getProgramPath(path);

  const declarations = j(programPath)
    .find(j.ImportDeclaration, {
      source: {
        value: source,
      },
    })
    .paths()
    .map((path) => path.node);

  if (declarations.length === 0) {
    const declaration = j.importDeclaration([], j.stringLiteral(source));

    declarations.push(declaration);
    programPath.node.body.unshift(declaration);
  }

  return {
    programPath,
    declarations,
  };
}

/**
 * addSideEffect
 * @param path
 * @param source
 */
export function addSideEffect(path: ASTPath, source: string) {
  getImports(path, source);
}

/**
 * addDefault
 * @param path
 * @param source
 */
export function addDefault(path: ASTPath, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        return specifier.local!;
      }
    }
  }

  const id = genUidIdentifier(programPath, '_default');

  declarations[0].specifiers!.unshift(j.importDefaultSpecifier(id));

  return id;
}

/**
 * addNamed
 * @param path
 * @param name
 * @param source
 */
export function addNamed(path: ASTPath, name: string, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.imported.name === name
      ) {
        return specifier.local!;
      }
    }
  }

  const id = genUidIdentifier(programPath, name);

  declarations[0].specifiers!.push(j.importSpecifier(j.identifier(name), id));

  return id;
}

/**
 * addNamespace
 * @param path
 * @param source
 */
export function addNamespace(path: ASTPath, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        return specifier.local!;
      }
    }
  }

  const id = genUidIdentifier(programPath, '_namespace');
  const newSpecifier = j.importNamespaceSpecifier(id);
  const firstDeclaration = declarations[0];

  if (firstDeclaration.specifiers!.length === 0) {
    firstDeclaration.specifiers!.unshift(newSpecifier);
  }

  //
  else {
    programPath.node.body.unshift({
      ...firstDeclaration,
      specifiers: [newSpecifier],
    });
  }

  return id;
}
