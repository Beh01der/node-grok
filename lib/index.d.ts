export class GrokPattern {
    parse(str: string, callback: { (err: any, result: any) });
    parseSync(str: string): any;
}

export class GrokCollection {
    createPattern(expression: string, id?: string): GrokPattern;
    getPattern(id: string): GrokPattern;
    load(filePath: string, callback: { (err?: any) });
    loadSync(filePath: string): number;
    count(): number;
}

export function loadDefault(loadModulesOrCallback?: string[] | string | { (err: any, collection: GrokCollection) }, callback?: { (err: any, collection: GrokCollection) });

export function loadDefaultSync(loadModules?: string[] | string): GrokCollection;
