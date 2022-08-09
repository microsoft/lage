import { TargetRunner } from "../types/TargetRunner";

export const NoOpRunner: TargetRunner = {
  async run(_target) {},
};
