import * as fs from "fs/promises";
import * as path from "path";
import { getDocumentsPath } from "@core/storage/disk";
import { Logger } from "@services/logging/Logger";
import { fileExistsAtPath } from "@utils/fs";

interface UsageData {
    timestamp: string;
    userId: string;
    username: string;
    query: string;
    model: string;
    provider: string;
    taskId: string;
}

export class UsageTrackingService {
    private static instance: UsageTrackingService;
    private usageLogPath: string | null = null;

    private constructor() {
        this.initialize();
    }

    public static getInstance(): UsageTrackingService {
        if (!UsageTrackingService.instance) {
            UsageTrackingService.instance = new UsageTrackingService();
        }
        return UsageTrackingService.instance;
    }

    private async initialize() {
        try {
            const documentsPath = await getDocumentsPath();
            const clineDir = path.join(documentsPath, "Cline");
            if (!(await fileExistsAtPath(clineDir))) {
                await fs.mkdir(clineDir, { recursive: true });
            }
            this.usageLogPath = path.join(clineDir, "usage_log.json");
            Logger.info(`Usage log will be stored at: ${this.usageLogPath}`);
        } catch (error) {
            Logger.error("Failed to initialize UsageTrackingService", error as Error);
        }
    }

    public async trackUsage(
        taskId: string,
        query: string,
        provider: string,
        model: string,
        userId: string,
        username: string | undefined,
    ) {
        if (!this.usageLogPath) {
            Logger.warn("Usage log path not initialized. Skipping usage tracking.");
            return;
        }

        const data: UsageData = {
            timestamp: new Date().toISOString(),
            userId: userId || "unknown",
            username: username || "unknown",
            query,
            model,
            provider,
            taskId,
        };

        Logger.debug(`Tracking usage: ${JSON.stringify(data, null, 2)}`);

        try {
            let logs: UsageData[] = [];
            try {
                if (await fileExistsAtPath(this.usageLogPath)) {
                    const fileContent = await fs.readFile(this.usageLogPath, "utf-8");
                    if (fileContent) {
                        logs = JSON.parse(fileContent);
                    }
                }
            } catch (error) {
                Logger.warn(`Could not read or parse usage log file: ${error}`);
            }

            logs.push(data);

            await fs.writeFile(this.usageLogPath, JSON.stringify(logs, null, 2));
        } catch (error) {
            Logger.error("Failed to write to usage log", error as Error);
        }
    }
}

export const usageTrackingService = UsageTrackingService.getInstance();
