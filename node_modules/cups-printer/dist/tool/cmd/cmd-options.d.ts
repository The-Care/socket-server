/// <reference types="node" />
/// <reference types="node" />
import { SpawnOptions } from 'child_process';
export interface CmdOptions extends SpawnOptions {
    encoding?: BufferEncoding;
}
