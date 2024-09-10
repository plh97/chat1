import { connect, set } from "mongoose";
import { MONGODB_ADDRESS } from "@/config";

set("strictQuery", true);

const db = connect(MONGODB_ADDRESS)
  .then((e) => {
    console.log("connect mongodb success!");
    return e;
  })
  .catch((error) => {
    console.log(error);
  });

export default db;
