import type { FC } from "react";

type Tree = {
  root: string;
  content: Tree[];
};

const treeify = (data: string): Tree[] => {
  const result: Tree[] = [];
  const levels = [result];
  for (const line of data.split("\n")) {
    let level = line.search(/\S/);
    const trimmed = line.trim();
    const root = trimmed.match(/(\*\s*)?(.*)/)?.[2] ?? trimmed;
    if (root) {
      const content: Tree[] = [];
      levels[level].push({ root, content });
      levels[++level] = content;
    }
  }
  return result;
};

const TreeDisplay: FC<{ tree: Tree[] }> = ({ tree }) => {
  return (
    <ul>
      {tree.map(({ root, content }) => (
        <>
          <li>{root}</li>
          <TreeDisplay tree={content} />
        </>
      ))}
    </ul>
  );
};

export default function PasswordPolicy({ policy }: Readonly<{ policy?: string }>) {
  if (!policy) {
    return null;
  }
  return (
    <div className="text-left">
      <TreeDisplay tree={treeify(policy)} />
    </div>
  );
}
