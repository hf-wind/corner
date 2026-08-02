import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { CreateCategoryDto } from '../../modules/category/dto/create-category.dto';
import { CreatePostDto } from '../../modules/post/dto/create-post.dto';
import { UpdateSettingDto } from '../../modules/settings/dto/update-setting.dto';
import { CreateTagDto } from '../../modules/tag/dto/create-tag.dto';
import { UpdateProfileDto } from '../../modules/user/dto/update-profile.dto';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : entry.name.endsWith('.ts')
        ? [path]
        : [];
  });
}

function decoratorsOf(node: ts.Node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : [];
}

describe('request contracts', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

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

  it('still rejects fields outside a DTO contract', async () => {
    await expect(
      pipe.transform(
        {
          title: 'Title',
          slug: 'title',
          content: 'content',
          type: 'article',
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
});
