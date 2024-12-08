import * as Cookies from "cookies"; // Add this import statement

// const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

export const privateKey =
  process.env.PRIVATE_KEY ||
  Buffer.from(Math.random().toString(2)).toString("base64");

export const personIcon = "/naruto2.jpeg";
// export const roomIcon =
//   "https://m.media-amazon.com/images/M/MV5BZmQ5NGFiNWEtMmMyMC00MDdiLTg4YjktOGY5Yzc2MDUxMTE1XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_UY1200_CR93,0,630,1200_AL_.jpg";

export const roomIcon =
  "https://static.okx.com/cdn/assets/imgs/221/A60595EC12C04739.png";

export const CookieConfig: Cookies.SetOption = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: false,
  secure: false,
};
