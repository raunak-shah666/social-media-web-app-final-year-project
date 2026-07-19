import {
    type RouteConfig,
    index,
    layout,
    route,
} from "@react-router/dev/routes";

export default [
    index("./routes/index.tsx"),
    layout("./routes/PublicLayout.tsx", [
        route("/signin", "./routes/signin.tsx"),
        route("/signup", "./routes/signup.tsx"),
        route("/verify-email", "./routes/verify-email.tsx"),
    ]),

    layout("./routes/AppLayout.tsx", [
        route("/home", "./routes/home.tsx"),
        route("/post/:id", "./routes/post.$id.tsx"),
        route("/messages", "./routes/messages.tsx"),
    ]),
] satisfies RouteConfig;
