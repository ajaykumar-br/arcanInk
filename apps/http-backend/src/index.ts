import express from "express";
import { z } from "zod";
import { SignInSchema, SignUpSchema } from "@repo/common/types";

const app = express();

app.use(express.json());

app.post('/signup',(req, res) => {
    // parse req throw zod
    const parsedReq = SignUpSchema.safeParse(req.body);

    // if not parsed correctly, respond with 403 incorrect error
    if(!parsedReq.success) {
        res.status(403).json({
            msg: "Invalid zod types"
        });
        return;
    }
    // put in db and respond with 200

});

app.post('/signin',(req, res) => {
    const parsedReq = SignInSchema.safeParse(req.body);
    // if not parsed correctly, respond with 403 incorrect error
    if (!parsedReq.success) {
        res.status(403).json({
        msg: "Invalid zod types",
        });
        return;
    }

    // validate with db for correct password
    // sign a jwt and send it back
});

app.listen(3001);