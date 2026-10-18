import type { Lesson } from "../../types";
import { lesson as l011 } from "./l0-1-1";
import { lesson as l021 } from "./l0-2-1";
import { lesson as l031 } from "./l0-3-1";
import { lesson as l111 } from "./l1-1-1";
import { lesson as l121 } from "./l1-2-1";
import { lesson as l211 } from "./l2-1-1";
import { lesson as l511 } from "./l5-1-1";
import { lesson as l711 } from "./l7-1-1";
import { lesson as l721 } from "./l7-2-1";
import { lesson as l911 } from "./l9-1-1";

export const lessons: Lesson[] = [l011, l021, l031, l111, l121, l211, l511, l711, l721, l911];

export const lessonById: Record<string, Lesson> = Object.fromEntries(lessons.map((l) => [l.id, l]));
