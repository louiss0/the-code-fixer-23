export interface LibraryGeneratorSchema {
  name: string;
  directory?: string;
  importPath: string;
  description?: string;
  skipFormat?: boolean;
}
