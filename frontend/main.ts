import { createApp } from "vue";
import { createHead } from "@unhead/vue/client";
import "ant-design-vue/dist/reset.css";
import "@fontsource-variable/noto-sans-sc/wght.css";
import "@fontsource-variable/nunito/wght.css";
import "misans/lib/Normal/MiSans-Regular.min.css";
import "misans/lib/Normal/MiSans-Medium.min.css";
import "misans/lib/Normal/MiSans-Bold.min.css";
import "./assets/styles/main.scss";
import App from "./app.vue";
import router from "./router";

const app = createApp(App);
const head = createHead();

let shiftPressed = false;
window.addEventListener("keydown", (event) => {
  if (event.key === "Shift") shiftPressed = true;
});
window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") shiftPressed = false;
});
window.addEventListener("blur", () => {
  shiftPressed = false;
});
document.addEventListener("selectstart", (event) => {
  if (shiftPressed) event.preventDefault();
});

app.use(router);
app.use(head);
app.mount("#app");
