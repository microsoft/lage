export interface RunTargetRequest {
  packageName?: string;
  task: string;
  taskArgs: string[];
  nodeOptions: string;
  npmClient: string;
  clientPid: number;
}

/**
 * @generated from message connectrpc.lage.v1.RunTargetResponse
 */
export interface RunTargetResponse {
  id: string;

  /**
   * @generated from field: optional string package_name = 2;
   */
  packageName?: string;

  /**
   * @generated from field: string task = 3;
   */
  task: string;

  /**
   * @generated from field: int32 exit_code = 4;
   */
  exitCode: number;

  /**
   * @generated from field: repeated string inputs = 5;
   */
  inputs: string[];

  /**
   * @generated from field: repeated string outputs = 6;
   */
  outputs: string[];

  /**
   * @generated from field: string stdout = 7;
   */
  stdout: string;

  /**
   * @generated from field: string stderr = 8;
   */
  stderr: string;
}

export interface ILageService {
  runTarget(request: RunTargetRequest): Promise<RunTargetResponse>;
  ping(): Promise<{ pong: boolean }>;
}
