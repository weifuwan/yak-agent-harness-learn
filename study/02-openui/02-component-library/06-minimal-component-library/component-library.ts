export type JsonObject = Record<string, unknown>

export type PropType = "string" | "number" | "boolean" | "string[]"

export type PropRule = {
  type: PropType
  required?: boolean
  enum?: string[]
}

export type ComponentGroup = {
  id: string
  description: string
}

export type ComponentDefinition = {
  name: string
  description: string
  props: Record<string, PropRule>
  reference: string
  group: string
}

export type ComponentImplementation = {
  id: string
  source: string
  exportName: string
}

export type ComponentUsage = {
  component: string
  purpose: string
  props: JsonObject
}

export type ComponentLibraryIssue = {
  code:
    | "duplicate-group"
    | "duplicate-component"
    | "duplicate-implementation"
    | "unknown-group"
    | "unresolved-reference"
  message: string
}

export type ResolvedComponent = {
  definition: ComponentDefinition
  implementation: ComponentImplementation
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
      continue
    }

    seen.add(value)
  }

  return [...duplicates]
}

function matchesType(value: unknown, type: PropType): boolean {
  if (type === "string") return typeof value === "string"
  if (type === "number") return typeof value === "number"
  if (type === "boolean") return typeof value === "boolean"

  if (type === "string[]") {
    return Array.isArray(value) && value.every((item) => typeof item === "string")
  }

  return false
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) {
    const itemTypes = [...new Set(value.map((item) => typeof item))]
    return "array<" + itemTypes.join("|") + ">"
  }

  if (value === null) return "null"
  return typeof value
}

export class ComponentLibrary {
  private readonly groups: ComponentGroup[]
  private readonly definitions: ComponentDefinition[]
  private readonly implementations: ComponentImplementation[]

  private readonly groupById: Map<string, ComponentGroup>
  private readonly definitionByName: Map<string, ComponentDefinition>
  private readonly implementationById: Map<string, ComponentImplementation>

  constructor(options: {
    groups: ComponentGroup[]
    definitions: ComponentDefinition[]
    implementations: ComponentImplementation[]
  }) {
    this.groups = [...options.groups]
    this.definitions = [...options.definitions]
    this.implementations = [...options.implementations]

    this.groupById = new Map(this.groups.map((group) => [group.id, group]))
    this.definitionByName = new Map(
      this.definitions.map((definition) => [definition.name, definition]),
    )
    this.implementationById = new Map(
      this.implementations.map((implementation) => [
        implementation.id,
        implementation,
      ]),
    )
  }

  validate(): ComponentLibraryIssue[] {
    const issues: ComponentLibraryIssue[] = []

    for (const groupId of findDuplicates(this.groups.map((group) => group.id))) {
      issues.push({
        code: "duplicate-group",
        message: "duplicate group: " + groupId,
      })
    }

    for (const componentName of findDuplicates(
      this.definitions.map((definition) => definition.name),
    )) {
      issues.push({
        code: "duplicate-component",
        message: "duplicate component: " + componentName,
      })
    }

    for (const implementationId of findDuplicates(
      this.implementations.map((implementation) => implementation.id),
    )) {
      issues.push({
        code: "duplicate-implementation",
        message: "duplicate implementation: " + implementationId,
      })
    }

    for (const definition of this.definitions) {
      if (!this.groupById.has(definition.group)) {
        issues.push({
          code: "unknown-group",
          message:
            "component " +
            definition.name +
            " uses unknown group: " +
            definition.group,
        })
      }

      if (!this.implementationById.has(definition.reference)) {
        issues.push({
          code: "unresolved-reference",
          message:
            "component " +
            definition.name +
            " uses unresolved reference: " +
            definition.reference,
        })
      }
    }

    return issues
  }

  assertValid(): void {
    const issues = this.validate()

    if (issues.length === 0) {
      return
    }

    throw new Error(
      "invalid ComponentLibrary:\n" +
        issues.map((issue) => "- " + issue.message).join("\n"),
    )
  }

  listGroups(): ComponentGroup[] {
    return [...this.groups]
  }

  list(): ComponentDefinition[] {
    return [...this.definitions]
  }

  get(name: string): ComponentDefinition | undefined {
    return this.definitionByName.get(name)
  }

  resolve(name: string): ResolvedComponent {
    const definition = this.definitionByName.get(name)

    if (!definition) {
      throw new Error("unknown component: " + name)
    }

    const implementation = this.implementationById.get(definition.reference)

    if (!implementation) {
      throw new Error(
        "unresolved component reference: " +
          definition.name +
          " -> " +
          definition.reference,
      )
    }

    return {
      definition,
      implementation,
    }
  }

  validateUsage(
    usage: ComponentUsage,
    allowedGroups?: ReadonlySet<string>,
  ): string[] {
    const definition = this.definitionByName.get(usage.component)
    const violations: string[] = []

    if (!definition) {
      return ["unknown component: " + usage.component]
    }

    if (allowedGroups && !allowedGroups.has(definition.group)) {
      violations.push(
        "component " +
          definition.name +
          " belongs to inactive group: " +
          definition.group,
      )
    }

    for (const [propName, rule] of Object.entries(definition.props)) {
      if (rule.required && !(propName in usage.props)) {
        violations.push("missing required prop: " + propName)
      }
    }

    for (const [propName, value] of Object.entries(usage.props)) {
      const rule = definition.props[propName]

      if (!rule) {
        violations.push("unknown prop: " + propName)
        continue
      }

      if (!matchesType(value, rule.type)) {
        violations.push(
          "wrong type for " +
            propName +
            ": expected " +
            rule.type +
            ", got " +
            valueType(value),
        )
        continue
      }

      if (
        rule.enum &&
        typeof value === "string" &&
        !rule.enum.includes(value)
      ) {
        violations.push(
          "invalid enum for " +
            propName +
            ": " +
            value +
            " not in " +
            rule.enum.join("|"),
        )
      }
    }

    return violations
  }

  scope(groupIds: string[]): ComponentScope {
    const uniqueGroupIds = [...new Set(groupIds)]

    for (const groupId of uniqueGroupIds) {
      if (!this.groupById.has(groupId)) {
        throw new Error("unknown component group: " + groupId)
      }
    }

    return new ComponentScope(this, uniqueGroupIds)
  }
}

export class ComponentScope {
  private readonly allowedGroups: ReadonlySet<string>

  constructor(
    private readonly library: ComponentLibrary,
    readonly groupIds: string[],
  ) {
    this.allowedGroups = new Set(groupIds)
  }

  list(): ComponentDefinition[] {
    return this.library
      .list()
      .filter((definition) => this.allowedGroups.has(definition.group))
  }

  get(name: string): ComponentDefinition | undefined {
    const definition = this.library.get(name)

    if (!definition || !this.allowedGroups.has(definition.group)) {
      return undefined
    }

    return definition
  }

  resolve(name: string): ResolvedComponent {
    const definition = this.get(name)

    if (!definition) {
      throw new Error("component is outside current scope: " + name)
    }

    return this.library.resolve(name)
  }

  validateUsage(usage: ComponentUsage): string[] {
    return this.library.validateUsage(usage, this.allowedGroups)
  }
}
