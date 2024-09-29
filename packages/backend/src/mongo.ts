import { prisma } from "db";

const genRanHex = (size: number) =>
  [...Array(size)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

async function main() {
  const hana = await prisma.user.create({
    data: {
      // id: genRanHex(12),
      createdAt: new Date(),
      // updatedAt: new Date(),
      username: genRanHex(12),
      password: "hana",
      friend: [],
    },
  });

  console.log(hana);
  const allUsers = await prisma.user.findMany({});
  console.log(allUsers);
}

// main()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());
