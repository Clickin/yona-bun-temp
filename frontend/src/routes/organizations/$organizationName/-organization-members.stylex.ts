import * as stylex from "@stylexjs/stylex";

export const errorStyles = stylex.create({
  wrap: {
    padding: "100px 0px",
    textAlign: "center",
  },
  icon: {
    backgroundPosition: "-80px -160px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "80px",
    verticalAlign: "middle",
    width: "50px",
  },
  message: {
    color: "#898989",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "30px 0px",
  },
  sprite: (backgroundImage: string) => ({ backgroundImage }),
});
