import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { defaultConfig } from './config.js';

export enum LogLevel {
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  ERROR = 'ERROR',
}

class Logger {
  private logDir: string;

  constructor() {
    this.logDir = defaultConfig.storage.logs;
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: unknown
  ): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  }

  private writeToFile(level: LogLevel, message: string, data?: unknown): void {
    const logFile = join(
      this.logDir,
      `app-${new Date().toISOString().split('T')[0]}.log`
    );
    const logMessage = this.formatMessage(level, message, data);
    writeFileSync(logFile, logMessage, { flag: 'a' });
  }

  info(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, data);
    console.log(formatted.trim());
    this.writeToFile(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: unknown): void {
    const formatted = this.formatMessage(LogLevel.DEBUG, message, data);
    console.debug(formatted.trim());
    this.writeToFile(LogLevel.DEBUG, message, data);
  }

  error(message: string, error?: unknown): void {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
    const formatted = this.formatMessage(LogLevel.ERROR, message, errorData);
    console.error(formatted.trim());
    this.writeToFile(LogLevel.ERROR, message, errorData);
  }
}

export const logger = new Logger();
