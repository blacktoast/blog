const PERSONAL_DIRECTIVE_NAME = "p";

function isPersonalOnlyDirective(node) {
  return (
    node &&
    node.type === "containerDirective" &&
    node.name === PERSONAL_DIRECTIVE_NAME
  );
}

function transformChildren(parent, isPersonalBuild) {
  if (!Array.isArray(parent?.children)) return;

  for (let index = parent.children.length - 1; index >= 0; index -= 1) {
    const child = parent.children[index];

    if (isPersonalOnlyDirective(child)) {
      transformChildren(child, isPersonalBuild);
      parent.children.splice(
        index,
        1,
        ...(isPersonalBuild && Array.isArray(child.children)
          ? child.children
          : []),
      );
      continue;
    }

    transformChildren(child, isPersonalBuild);
  }
}

export function createPersonalOnlyTransformer({ isPersonalBuild } = {}) {
  const shouldRenderPersonal =
    isPersonalBuild ?? process.env.PUBLIC_TYPE === "personal";

  return function personalOnlyTransformer(tree) {
    transformChildren(tree, shouldRenderPersonal);
  };
}

export default function remarkPersonalOnly(options = {}) {
  return createPersonalOnlyTransformer(options);
}
