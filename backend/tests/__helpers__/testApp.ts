import { app } from "../../src/server";
import type { FastifyInstance } from "fastify";

let teste: FastifyInstance | undefined;

export async function getTestApp() {
  if (!teste) {
    teste = app
    await teste.ready()
  }
  return teste
}

export async function closeTestApp() {
  if (teste) {
    teste = app
    teste = undefined
  }
}
