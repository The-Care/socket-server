/// <reference types="node" />
export declare class Printer {
    /**
     * Gets all available printers installed locally in this device.
     */
    static all(): Promise<Printer[]>;
    /**
     *
     * @param predicate A function to filter
     * @returns
     */
    static find(predicate: (x: Printer, i: number) => boolean): Promise<Printer | undefined>;
    static some(predicate: (x: Printer, i: number) => boolean): Promise<boolean>;
    readonly name: string;
    readonly path: string;
    private constructor();
    print(path: string): Promise<void>;
    print(buffer: Buffer): Promise<void>;
}
