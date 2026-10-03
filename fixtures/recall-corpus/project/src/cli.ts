#!/usr/bin/env node
import { logFor } from "./git.js";
import { start } from "./startup.js";

start();
const branch = process.argv[2] ?? "main";
process.stdout.write(logFor(branch));
