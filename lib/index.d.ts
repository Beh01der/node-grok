export class GrokPattern {
    parse(str: string, callback: { (err: any, result: any): any }): any;
    parseSync(str: string): any;
}

export class GrokCollection {
    createPattern(expression: string, id?: string): GrokPattern;
    getPattern(id: string): GrokPattern;
    load(filePath: string, callback: { (err?: any): any }): any;
    loadSync(filePath: string): number;
    count(): number;
}

export function loadDefault(loadModulesOrCallback?: string[] | string | { (err: any, collection: GrokCollection): any }, callback?: { (err: any, collection: GrokCollection): any }): any;

export function loadDefaultSync(loadModules?: string[] | string): GrokCollection;
