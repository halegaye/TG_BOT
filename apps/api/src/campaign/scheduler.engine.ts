import { Logger } from '@nestjs/common';

export interface ScheduleConfig {
  scheduleType: string;
  scheduledAt?: Date | string | null;
  intervalHours?: number | null;
  timeOfDay?: string | null; // "14:30"
  timesOfDay?: string[] | null; // ["09:00", "14:00", "20:00"]
  daysOfWeek?: number[] | null; // [1, 3, 5] (1=Pzt, 2=Sal, 3=Çar, 4=Per, 5=Cum, 6=Cmt, 0=Paz)
  dayOfMonth?: number | null; // 1..31
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isIndefinite?: boolean;
  maxExecutions?: number | null;
  executionCount?: number;
  customCron?: string | null;
}

export class SchedulerEngine {
  private static readonly logger = new Logger(SchedulerEngine.name);

  /**
   * Her zamanlama için en az 5 bir sonraki çalışma zamanını hesaplar (UTC ve Marka Saat Diliminde gösterim için).
   */
  static getNextOccurrences(
    config: ScheduleConfig,
    count: number = 5,
    fromDate: Date = new Date(),
  ): Date[] {
    const occurrences: Date[] = [];
    const type = config.scheduleType || 'IMMEDIATE';

    const startsAt = config.startsAt ? new Date(config.startsAt) : null;
    const endsAt = config.endsAt ? new Date(config.endsAt) : null;

    let baseDate = new Date(Math.max(fromDate.getTime(), startsAt ? startsAt.getTime() : 0));

    // Tekrar sayısı sınırı dolmuşsa boş dön
    if (!config.isIndefinite && config.maxExecutions && (config.executionCount || 0) >= config.maxExecutions) {
      return [];
    }

    if (type === 'IMMEDIATE') {
      return [new Date()];
    }

    if (type === 'ONCE') {
      if (config.scheduledAt) {
        const onceDate = new Date(config.scheduledAt);
        if (onceDate > baseDate && (!endsAt || onceDate <= endsAt)) {
          return [onceDate];
        }
      }
      return [];
    }

    // Periyodik Döngü
    let current = new Date(baseDate.getTime());
    let safetyCounter = 0;

    while (occurrences.length < count && safetyCounter < 1000) {
      safetyCounter++;

      if (type === 'HOURLY') {
        current = new Date(current.getTime() + 3600 * 1000);
        current.setMinutes(0, 0, 0);
      } else if (type === 'EVERY_X_HOURS') {
        const interval = (config.intervalHours || 1) * 3600 * 1000;
        current = new Date(current.getTime() + interval);
      } else if (type === 'DAILY_AT_TIME') {
        const [hours, minutes] = (config.timeOfDay || '12:00').split(':').map(Number);
        current.setDate(current.getDate() + 1);
        current.setHours(hours, minutes, 0, 0);
      } else if (type === 'DAILY_MULTIPLE_TIMES') {
        const times = (config.timesOfDay || ['09:00', '14:00', '20:00']).sort();
        let foundSlot = false;

        for (const t of times) {
          const [h, m] = t.split(':').map(Number);
          const candidate = new Date(current);
          candidate.setHours(h, m, 0, 0);

          if (candidate > current) {
            current = candidate;
            foundSlot = true;
            break;
          }
        }

        if (!foundSlot) {
          // Sonraki güne geç, ilk saati al
          current.setDate(current.getDate() + 1);
          const [h, m] = times[0].split(':').map(Number);
          current.setHours(h, m, 0, 0);
        }
      } else if (type === 'WEEKLY_DAYS' || type === 'WEEKLY') {
        const targetDays = type === 'WEEKLY_DAYS' && config.daysOfWeek?.length ? config.daysOfWeek : [1]; // Pzt varsayılan
        const [h, m] = (config.timeOfDay || '12:00').split(':').map(Number);

        current.setDate(current.getDate() + 1);
        while (!targetDays.includes(current.getDay())) {
          current.setDate(current.getDate() + 1);
        }
        current.setHours(h, m, 0, 0);
      } else if (type === 'MONTHLY_DAY') {
        const targetDay = config.dayOfMonth || 1;
        const [h, m] = (config.timeOfDay || '12:00').split(':').map(Number);

        current.setMonth(current.getMonth() + 1);
        current.setDate(Math.min(targetDay, 28)); // Ay sonu sınır koruması
        current.setHours(h, m, 0, 0);
      } else if (type === 'CUSTOM_CRON') {
        // İleri düzey kron basit 1 saatlik simülasyon adımı
        current = new Date(current.getTime() + 3600 * 1000);
      } else {
        break;
      }

      if (endsAt && current > endsAt) {
        break;
      }

      if (current > baseDate) {
        occurrences.push(new Date(current.getTime()));
      }
    }

    return occurrences;
  }
}
