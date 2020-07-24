import {
  ReflectionType,
  ReferenceType,
  ArrayType,
  UnionType,
  IntersectionType,
  TupleType,
  IntrinsicType,
  StringLiteralType,
  TypeOperatorType,
  Type,
  DeclarationReflection,
} from "typedoc/dist/lib/models";
import { ReflectionKind } from "typedoc";

export function getType(model: Type | DeclarationReflection) {
  if (
    model instanceof DeclarationReflection &&
    model.kind === ReflectionKind.Interface
  ) {
    return getInterfaceType(model);
  }

  if (
    model instanceof DeclarationReflection &&
    model.kind === ReflectionKind.Module
  ) {
    return getModuleType(model);
  }

  if (
    model instanceof ReferenceType &&
    (model.reflection || (model.name && model.typeArguments))
  ) {
    return getReferenceType(model);
  }
  if (model instanceof ArrayType && model.elementType) {
    return getArrayType(model);
  }
  if (model instanceof UnionType && model.types) {
    return getUnionType(model);
  }
  if (model instanceof IntersectionType && model.types) {
    return getIntersectionType(model);
  }
  if (model instanceof TupleType && model.elements) {
    return getTupleType(model);
  }
  if (model instanceof IntrinsicType && model.name) {
    return getIntrinsicType(model);
  }
  if (model instanceof StringLiteralType && model.value) {
    return getStringLiteralType(model);
  }

  if (model instanceof TypeOperatorType) {
    return model.toString();
  }

  if (model instanceof ReflectionType) {
    return getType(model.declaration);
  }

  if (typeof model === "undefined") {
    return "";
  }

  if (
    model instanceof DeclarationReflection &&
    model.kindString === "Type alias"
  ) {
    return getTypeAlias(model);
  }

  if (
    model instanceof DeclarationReflection &&
    model.kindString === "Type literal"
  ) {
    return getTypeLiteral(model);
  }

  return model.toString();
}

function getReferenceType(model: ReferenceType) {
  const reflection = [model.name];

  if (model.typeArguments) {
    reflection.push(
      `<${model.typeArguments
        .map((typeArgument) => `${getType(typeArgument)}`)
        .join(", ")}>`
    );
  }

  return model.name === "Map"
    ? `${reflection.join("")}`
    : `[${reflection.join("")}](#${model.name})`;
}
function getArrayType(model: ArrayType): string {
  return `${getType(model.elementType)}[]`;
}
function getUnionType(model: UnionType): string {
  return model.types.map((unionType) => getType(unionType)).join(" | ");
}
function getIntersectionType(model: IntersectionType): string {
  return model.types
    .map((intersectionType) => getType(intersectionType))
    .join(" & ");
}
function getTupleType(model: TupleType): string {
  return `[${model.elements.map((element) => getType(element)).join(", ")}]`;
}
function getIntrinsicType(model: IntrinsicType) {
  return model.name;
}
function getStringLiteralType(model: StringLiteralType) {
  return `"${model.value}"`;
}
function getInterfaceType(model: DeclarationReflection) {
  return `### ${model.name}
${
  model.children && model.children.map
    ? model.children
        .map((child) => {
          if (child.kind === ReflectionKind.Property) {
            return `#### ${child.name}
_type: ${getType(child.type)}_${
              child.comment ? "\n\n" + child.comment.shortText : ""
            }${
              child.comment && child.comment.text
                ? "\n\n" + child.comment.text
                : ""
            }
  `;
          }
        })
        .map((line) => line.trimLeft())
        .join("\n")
    : getType(model.type)
}
`;
}

function getModuleType(model: DeclarationReflection) {
  return model.children.map((child) => getType(child)).join("\n");
}

function getTypeAlias(model: DeclarationReflection) {
  return `### ${model.name}\n\n_type: ${getType(model.type)}_\n`;
}

function getTypeLiteral(model: DeclarationReflection) {
  const props = model.children.map(
    (child) => `${child.name}: ${getType(child.type)}`
  );

  return `{ ${props.join(", ")} }`;
}
