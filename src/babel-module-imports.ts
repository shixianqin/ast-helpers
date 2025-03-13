import * as t from '@babel/types';
import type { ImportDeclaration, Program } from '@babel/types';
import type { NodePath } from '@babel/traverse';

function getProgramPath(path: NodePath) {
  while (path) {
    if (t.isProgram(path.node)) {
      break;
    }

    path = path.parentPath!;
  }

  if (!path) {
    throw new Error('Unable to find the program node.');
  }

  return path as NodePath<Program>;
}

function getImports(path: NodePath, source: string) {
  const programPath = getProgramPath(path);
  const { body } = programPath.node;
  const declarations: ImportDeclaration[] = [];

  for (const node of body) {
    if (t.isImportDeclaration(node) && node.source.value === source) {
      declarations.push(node);
    }
  }

  if (declarations.length === 0) {
    const declaration = t.importDeclaration([], t.stringLiteral(source));

    declarations.push(declaration);
    body.unshift(declaration);
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
export function addSideEffect(path: NodePath, source: string) {
  getImports(path, source);
}

/**
 * addDefault
 * @param path
 * @param source
 */
export function addDefault(path: NodePath, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (t.isImportDefaultSpecifier(specifier)) {
        return specifier.local;
      }
    }
  }

  const local = programPath.scope.generateUidIdentifier();

  declarations[0].specifiers!.unshift(t.importDefaultSpecifier(local));

  return local;
}

/**
 * addNamed
 * @param path
 * @param name
 * @param source
 */
export function addNamed(path: NodePath, name: string, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (t.isImportSpecifier(specifier)) {
        const { imported, local } = specifier;

        if (
          t.isIdentifier(imported)
            ? imported.name === name
            : imported.value === name
        ) {
          return local;
        }
      }
    }
  }

  const local = programPath.scope.generateUidIdentifier(name);

  declarations[0].specifiers!.push(
    t.importSpecifier(local, t.identifier(name)),
  );

  return local;
}

/**
 * addNamespace
 * @param path
 * @param source
 */
export function addNamespace(path: NodePath, source: string) {
  const { programPath, declarations } = getImports(path, source);

  for (const declaration of declarations) {
    for (const specifier of declaration.specifiers!) {
      if (t.isImportNamespaceSpecifier(specifier)) {
        return specifier.local!;
      }
    }
  }

  const id = programPath.scope.generateUidIdentifier();
  const newSpecifier = t.importNamespaceSpecifier(id);
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
