import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.model.createMany({
    data: [
      {
        name: "Qwen 30B Instruct",
        provider: "flock",
        apiModelId: "qwen3-30b-a3b-instruct-2507"
      },
      {
        name: "Qwen 235B Thinking",
        provider: "flock",
        apiModelId: "qwen3-235b-a22b-thinking-2507"
      },
      {
        name: "Qwen 235B Instruct",
        provider: "flock",
        apiModelId: "qwen3-235b-a22b-instruct-2507"
      }
    ]
  });

  console.log("FLock models inserted!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
