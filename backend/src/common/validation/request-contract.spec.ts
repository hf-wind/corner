import { BadRequestException } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { PolishMomentDto } from '../../modules/ai/dto/polish-moment.dto';
import { CreateCategoryDto } from '../../modules/category/dto/create-category.dto';
import { CreateMomentDto } from '../../modules/moment/dto/create-moment.dto';
import { CreatePostDto } from '../../modules/post/dto/create-post.dto';
import { UpdateSettingDto } from '../../modules/settings/dto/update-setting.dto';
import { CreateTagDto } from '../../modules/tag/dto/create-tag.dto';
import { UpdateProfileDto } from '../../modules/user/dto/update-profile.dto';
import { createRequestValidationPipe } from './request-validation.pipe';

function sourceFiles(
  directory: string,
  extensions: ReadonlySet<string> = new Set(['.ts']),
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.isDirectory() &&
      (entry.name.startsWith('.') ||
        ['node_modules', 'dist', 'coverage'].includes(entry.name))
    ) {
      return [];
    }
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path, extensions)
      : [...extensions].some((extension) => entry.name.endsWith(extension))
        ? [path]
        : [];
  });
}

function decoratorsOf(node: ts.Node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : [];
}

function decoratorCall(
  node: ts.Node,
  names: ReadonlySet<string>,
): ts.CallExpression | undefined {
  for (const decorator of decoratorsOf(node)) {
    if (!ts.isCallExpression(decorator.expression)) continue;
    const expression = decorator.expression.expression;
    if (ts.isIdentifier(expression) && names.has(expression.text)) {
      return decorator.expression;
    }
  }
  return undefined;
}

function stringArgument(call: ts.CallExpression | undefined) {
  const argument = call?.arguments[0];
  return argument && ts.isStringLiteralLike(argument) ? argument.text : '';
}

function joinRoute(...parts: string[]) {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')}`;
}

function routeFragments(expression: ts.Expression): string[] {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (ts.isConditionalExpression(expression)) {
    return [
      ...routeFragments(expression.whenTrue),
      ...routeFragments(expression.whenFalse),
    ];
  }
  return [':param'];
}

function routesFromExpression(expression: ts.Expression): string[] {
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (!ts.isTemplateExpression(expression)) return [];
  let routes = [expression.head.text];
  for (const span of expression.templateSpans) {
    routes = routes.flatMap((route) =>
      routeFragments(span.expression).map(
        (fragment) => `${route}${fragment}${span.literal.text}`,
      ),
    );
  }
  return routes;
}

function routeMatches(frontendRoute: string, backendRoute: string) {
  const frontendParts = frontendRoute.split('?')[0].split('/').filter(Boolean);
  const backendParts = backendRoute.split('/').filter(Boolean);
  return (
    frontendParts.length === backendParts.length &&
    backendParts.every(
      (part, index) => part.startsWith(':') || part === frontendParts[index],
    )
  );
}

function propertyName(node: ts.PropertyName | ts.BindingName) {
  return ts.isIdentifier(node) || ts.isStringLiteralLike(node)
    ? node.text
    : undefined;
}

type DtoDeclaration = {
  fields: Set<string>;
  bases: Set<string>;
};

function dtoDeclarations(files: string[]) {
  const declarations = new Map<string, DtoDeclaration>();
  const duplicates = new Set<string>();

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const inspect = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name?.text.endsWith('Dto')) {
        const name = node.name.text;
        if (declarations.has(name)) duplicates.add(name);
        const fields = new Set<string>();
        for (const member of node.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          const name = propertyName(member.name);
          if (name) fields.add(name);
        }
        const bases = new Set<string>();
        for (const clause of node.heritageClauses || []) {
          for (const type of clause.types) {
            const collectDtoNames = (current: ts.Node) => {
              if (
                ts.isIdentifier(current) &&
                current.text.endsWith('Dto') &&
                current.text !== name
              ) {
                bases.add(current.text);
              }
              ts.forEachChild(current, collectDtoNames);
            };
            collectDtoNames(type.expression);
          }
        }
        declarations.set(name, { fields, bases });
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
  }

  return { declarations, duplicates };
}

function fieldsForDto(
  name: string,
  declarations: Map<string, DtoDeclaration>,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(name)) return new Set();
  seen.add(name);
  const declaration = declarations.get(name);
  const fields = new Set(declaration?.fields || []);
  for (const base of declaration?.bases || []) {
    for (const field of fieldsForDto(base, declarations, seen)) {
      fields.add(field);
    }
  }
  return fields;
}

function frontendScript(file: string) {
  const content = readFileSync(file, 'utf8');
  if (!file.endsWith('.vue')) return content;
  return [...content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join('\n');
}

describe('request contracts', () => {
  const pipe = createRequestValidationPipe();

  it('accepts the current post, profile, and arbitrary setting payloads', async () => {
    await expect(
      pipe.transform(
        {
          title: 'Title',
          slug: 'title',
          content: 'content',
          excerpt: '',
          coverImage: '',
          categoryId: undefined,
          tagIds: [],
          featured: false,
        },
        { type: 'body', metatype: CreatePostDto },
      ),
    ).resolves.toBeInstanceOf(CreatePostDto);

    await expect(
      pipe.transform(
        {
          username: 'huifeng',
          avatar: null,
          bio: null,
        },
        { type: 'body', metatype: UpdateProfileDto },
      ),
    ).resolves.toBeInstanceOf(UpdateProfileDto);

    const setting = await pipe.transform(
      {
        key: 'about_profile',
        value: {
          socialLinks: [{ type: 'website', url: 'https://corner.ink' }],
        },
      },
      { type: 'body', metatype: UpdateSettingDto },
    );
    expect(setting).toEqual(
      expect.objectContaining({
        key: 'about_profile',
        value: {
          socialLinks: [{ type: 'website', url: 'https://corner.ink' }],
        },
      }),
    );

    for (const metatype of [CreateCategoryDto, CreateTagDto]) {
      await expect(
        pipe.transform(
          {
            name: 'Name',
            slug: 'name',
            icon: 'ph:tag-bold',
            color: '#1677ff',
          },
          { type: 'body', metatype },
        ),
      ).resolves.toBeInstanceOf(metatype);
    }
  });

  it('strips fields outside a DTO contract for backward compatibility', async () => {
    const post = await pipe.transform(
      {
        title: 'Title',
        slug: 'title',
        content: 'content',
        type: 'article',
      },
      { type: 'body', metatype: CreatePostDto },
    );

    expect(post).toBeInstanceOf(CreatePostDto);
    expect(post).toEqual({
      title: 'Title',
      slug: 'title',
      content: 'content',
    });
    expect(post).not.toHaveProperty('type');
  });

  it('accepts both AI moment creation payloads and strips stale response fields', async () => {
    const polishRequest = await pipe.transform(
      {
        inspiration: '下班后绕路去了江边。',
        type: 'moment',
        source: 'admin-ai-creator',
      },
      { type: 'body', metatype: PolishMomentDto },
    );

    expect(polishRequest).toBeInstanceOf(PolishMomentDto);
    expect(polishRequest).toEqual({
      inspiration: '下班后绕路去了江边。',
    });

    const basicMoment = await pipe.transform(
      {
        title: '江边晚风',
        slug: 'river-evening',
        content: '下班后绕路去了江边。',
        excerpt: '一个普通但值得留下的傍晚。',
        type: 'moment',
        source: 'ai',
        createdAt: '2026-08-02T12:00:00.000Z',
      },
      { type: 'body', metatype: CreateMomentDto },
    );

    expect(basicMoment).toBeInstanceOf(CreateMomentDto);
    expect(basicMoment).toEqual({
      title: '江边晚风',
      slug: 'river-evening',
      content: '下班后绕路去了江边。',
      excerpt: '一个普通但值得留下的傍晚。',
    });

    const locatedMoment = await pipe.transform(
      {
        title: '江边晚风',
        slug: 'river-evening',
        content: '下班后绕路去了江边。',
        placeId: '76438d82-7bcd-47fb-9ce6-5d09bb93cf03',
        happenedAt: '2026-08-02T12:00:00.000Z',
        locationVisibility: 'blurred',
        locationPrecision: 'city',
        locationSource: 'manual',
        confirmExactLocation: false,
      },
      { type: 'body', metatype: CreateMomentDto },
    );

    expect(locatedMoment).toEqual(
      expect.objectContaining({
        placeId: '76438d82-7bcd-47fb-9ce6-5d09bb93cf03',
        locationVisibility: 'blurred',
        locationPrecision: 'city',
        locationSource: 'manual',
        confirmExactLocation: false,
      }),
    );
  });

  it('still rejects invalid values for declared DTO fields', async () => {
    await expect(
      pipe.transform(
        {
          title: 'Title',
          slug: 'title',
          content: 'content',
          featured: 'not-a-boolean',
        },
        { type: 'body', metatype: CreatePostDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires every controller body to use a validated DTO', () => {
    const failures: string[] = [];
    const modulesRoot = join(process.cwd(), 'src', 'modules');

    for (const file of sourceFiles(modulesRoot).filter((path) =>
      path.endsWith('.controller.ts'),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const inspect = (node: ts.Node) => {
        if (ts.isParameter(node)) {
          const bodyDecorator = decoratorsOf(node).find((decorator) =>
            decorator.getText(source).startsWith('@Body'),
          );
          if (bodyDecorator) {
            const bodyCall = bodyDecorator.expression;
            const hasPropertySelector =
              ts.isCallExpression(bodyCall) && bodyCall.arguments.length > 0;
            const typeName = node.type?.getText(source) || '';
            if (hasPropertySelector || !typeName.endsWith('Dto')) {
              const line =
                source.getLineAndCharacterOfPosition(node.getStart(source))
                  .line + 1;
              failures.push(
                `${file}:${line} ${bodyDecorator.getText(source)} ${typeName}`,
              );
            }
          }
        }
        ts.forEachChild(node, inspect);
      };
      inspect(source);
    }

    expect(failures).toEqual([]);
  });

  it('requires every declared DTO property to have validation metadata', () => {
    const failures: string[] = [];
    const sourceRoot = join(process.cwd(), 'src');

    for (const file of sourceFiles(sourceRoot).filter(
      (path) => !path.endsWith('.spec.ts'),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const inspect = (node: ts.Node) => {
        if (ts.isClassDeclaration(node) && node.name?.text.endsWith('Dto')) {
          for (const member of node.members) {
            if (
              !ts.isPropertyDeclaration(member) ||
              decoratorsOf(member).length > 0
            )
              continue;
            const line =
              source.getLineAndCharacterOfPosition(member.getStart(source))
                .line + 1;
            failures.push(
              `${file}:${line} ${node.name.text}.${member.name.getText(source)}`,
            );
          }
        }
        ts.forEachChild(node, inspect);
      };
      inspect(source);
    }

    expect(failures).toEqual([]);
  });

  it('keeps statically analyzable frontend write payloads within backend DTO contracts', () => {
    const backendRoot = join(process.cwd(), 'src');
    const frontendRoot = join(process.cwd(), '..', 'frontend');
    const backendFiles = sourceFiles(backendRoot);
    const { declarations, duplicates } = dtoDeclarations(backendFiles);
    const contracts: Array<{
      method: string;
      route: string;
      dto: string;
      fields: Set<string>;
    }> = [];
    const backendRoutes: Array<{ method: string; route: string }> = [];

    for (const file of backendFiles.filter((path) =>
      path.endsWith('.controller.ts'),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const inspect = (node: ts.Node) => {
        if (!ts.isClassDeclaration(node)) {
          ts.forEachChild(node, inspect);
          return;
        }
        const controller = decoratorCall(node, new Set(['Controller']));
        if (!controller) return;
        const prefix = stringArgument(controller);

        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member)) continue;
          const requestMethods = ['Post', 'Put', 'Patch', 'Delete'] as const;
          const requestMethod = requestMethods.find((name) =>
            decoratorCall(member, new Set([name])),
          );
          if (!requestMethod) continue;
          const request = decoratorCall(member, new Set([requestMethod]));
          const route = joinRoute(prefix, stringArgument(request));
          backendRoutes.push({
            method: requestMethod.toLowerCase(),
            route,
          });
          const body = member.parameters.find((parameter) =>
            decoratorCall(parameter, new Set(['Body'])),
          );
          if (!body?.type) continue;
          const dto = body.type.getText(source);
          contracts.push({
            method: requestMethod.toLowerCase(),
            route,
            dto,
            fields: fieldsForDto(dto, declarations),
          });
        }
      };
      inspect(source);
    }

    const failures: string[] = [];
    const unmatched: string[] = [];
    let checkedPayloads = 0;
    let checkedRoutes = 0;
    const frontendFiles = sourceFiles(frontendRoot, new Set(['.ts', '.vue']));

    for (const file of frontendFiles) {
      const source = ts.createSourceFile(
        file,
        frontendScript(file),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const initializers = new Map<string, ts.Expression | null>();
      const collectInitializers = (node: ts.Node) => {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer
        ) {
          const name = node.name.text;
          initializers.set(
            name,
            initializers.has(name) ? null : node.initializer,
          );
        }
        ts.forEachChild(node, collectInitializers);
      };
      collectInitializers(source);

      const payloadFields = (
        expression: ts.Expression,
        seen = new Set<string>(),
      ): Set<string> | undefined => {
        if (
          ts.isAsExpression(expression) ||
          ts.isTypeAssertionExpression(expression) ||
          ts.isParenthesizedExpression(expression) ||
          ts.isSatisfiesExpression(expression) ||
          ts.isNonNullExpression(expression)
        ) {
          return payloadFields(expression.expression, seen);
        }
        if (ts.isIdentifier(expression)) {
          if (seen.has(expression.text)) return undefined;
          const initializer = initializers.get(expression.text);
          if (!initializer) return undefined;
          return payloadFields(initializer, new Set(seen).add(expression.text));
        }
        if (
          ts.isCallExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === 'reactive' &&
          expression.arguments[0]
        ) {
          return payloadFields(expression.arguments[0], seen);
        }
        if (!ts.isObjectLiteralExpression(expression)) return undefined;

        const fields = new Set<string>();
        for (const property of expression.properties) {
          if (ts.isSpreadAssignment(property)) {
            for (const field of payloadFields(property.expression, seen) ||
              []) {
              fields.add(field);
            }
            continue;
          }
          if (
            ts.isPropertyAssignment(property) ||
            ts.isShorthandPropertyAssignment(property) ||
            ts.isMethodDeclaration(property)
          ) {
            const name = propertyName(property.name);
            if (name) fields.add(name);
          }
        }
        return fields;
      };

      const inspectCalls = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'api' &&
          ['post', 'put', 'patch', 'delete', 'upload', 'postStream'].includes(
            node.expression.name.text,
          ) &&
          node.arguments.length >= 1
        ) {
          const apiMethod = node.expression.name.text;
          const method = ['upload', 'postStream'].includes(apiMethod)
            ? 'post'
            : apiMethod;
          const routes = routesFromExpression(node.arguments[0]);
          const fields = node.arguments[1]
            ? payloadFields(node.arguments[1])
            : undefined;
          if (routes.length) {
            for (const route of routes) {
              const line =
                source.getLineAndCharacterOfPosition(node.getStart(source))
                  .line + 1;
              const routeExists = backendRoutes.some(
                (backendRoute) =>
                  backendRoute.method === method &&
                  routeMatches(route, backendRoute.route),
              );
              if (!routeExists) {
                unmatched.push(
                  `${file}:${line} ${method.toUpperCase()} ${route}`,
                );
                continue;
              }
              checkedRoutes += 1;
              if (!fields || apiMethod === 'upload') continue;
              const candidates = contracts
                .filter(
                  (contract) =>
                    contract.method === method &&
                    routeMatches(route, contract.route),
                )
                .sort(
                  (left, right) =>
                    right.route
                      .split('/')
                      .filter((part) => part && !part.startsWith(':')).length -
                    left.route
                      .split('/')
                      .filter((part) => part && !part.startsWith(':')).length,
                );
              const contract = candidates[0];
              if (!contract) {
                unmatched.push(
                  `${file}:${line} ${method.toUpperCase()} ${route} has a payload without a DTO contract`,
                );
              } else {
                checkedPayloads += 1;
                const unexpected = [...fields].filter(
                  (field) => !contract.fields.has(field),
                );
                if (unexpected.length) {
                  failures.push(
                    `${file}:${line} ${method.toUpperCase()} ${route} -> ${contract.dto}: ${unexpected.join(', ')}`,
                  );
                }
              }
            }
          }
        }
        ts.forEachChild(node, inspectCalls);
      };
      inspectCalls(source);
    }

    expect([...duplicates]).toEqual([]);
    expect(unmatched).toEqual([]);
    expect(failures).toEqual([]);
    expect(checkedPayloads).toBeGreaterThanOrEqual(60);
    expect(checkedRoutes).toBeGreaterThanOrEqual(109);
  });
});
