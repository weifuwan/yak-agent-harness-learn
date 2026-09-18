import type {
  ComponentDefinition,
  ComponentLibrary,
  ComponentScope,
  PropRule,
} from "../../02-component-library/06-minimal-component-library/component-library.js"

export type PromptExample = {
  id: string
  request: string
  answer: unknown
}

export type ComponentPromptSpec = {
  intro: string
  rules: string[]
  examples: PromptExample[]
  outputContract: string
}

export type GeneratePromptInput = {
  request: string
  scope: ComponentScope
  spec: ComponentPromptSpec
}

function propTypeText(rule: PropRule): string {
  if (rule.enum) {
    return rule.enum.map((value) => JSON.stringify(value)).join(" | ")
  }

  return rule.type
}

function toSignature(definition: ComponentDefinition): string {
  const props = Object.entries(definition.props)
    .map(([name, rule]) => {
      const optional = rule.required ? "" : "?"
      return name + optional + ": " + propTypeText(rule)
    })
    .join(", ")

  return definition.name + "(" + props + ")"
}

export class ComponentPromptGenerator {
  constructor(private readonly library: ComponentLibrary) {}

  generate(input: GeneratePromptInput): string {
    const { request, scope, spec } = input
    const groupById = new Map(
      this.library.listGroups().map((group) => [group.id, group]),
    )

    const catalog = scope.groupIds
      .map((groupId) => {
        const group = groupById.get(groupId)

        if (!group) {
          throw new Error("unknown group in ComponentScope: " + groupId)
        }

        const components = scope
          .list()
          .filter((definition) => definition.group === groupId)

        return [
          "## " + group.id,
          group.description,
          ...components.map((definition) =>
            "- " +
              toSignature(definition) +
              " — " +
              definition.description,
          ),
        ].join("\n")
      })
      .join("\n\n")

    const examples = spec.examples
      .map((example) =>
        [
          "### Example: " + example.id,
          "User: " + example.request,
          "Assistant:",
          JSON.stringify(example.answer, null, 2),
        ].join("\n"),
      )
      .join("\n\n")

    return [
      spec.intro,
      "",
      "# User Request",
      request,
      "",
      "# Components",
      catalog,
      "",
      "# Rules",
      ...spec.rules.map((rule) => "- " + rule),
      "",
      "# Examples",
      examples || "(none)",
      "",
      "# Output Contract",
      spec.outputContract,
    ].join("\n")
  }
}
