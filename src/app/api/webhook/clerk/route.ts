import { buffer } from "micro";
import { Webhook, WebhookRequiredHeaders } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET1;

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const buf = await buffer(req);
  const svixHeaders: WebhookRequiredHeaders = {
    "svix-id": req.headers.get("svix-id") as string,
    "svix-timestamp": req.headers.get("svix-timestamp") as string,
    "svix-signature": req.headers.get("svix-signature") as string,
  };

  let event: any; // Changed to 'any' for type safety

  try {
    const wh = new Webhook(webhookSecret!);
    event = wh.verify(buf.toString(), svixHeaders);
  } catch (err: any) {
    console.log(
      `⚠️  Clerk Webhook signature verification failed: ${err.message}`,
    );
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  console.log("Received event:", event);

  if (event.type === "user.created") {
    const user = event.data;
    try {
      // Create a Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: user.primaryEmailAddress,
        metadata: {
          clerkId: user.id,
        },
      });

      // Update Clerk user with the Stripe customer ID
      await clerkClient.users.updateUser(user.id, {
        publicMetadata: {
          premium: "no",
          stripeCustomerId: stripeCustomer.id,
        },
      });

      console.log(
        `User ${user.id} metadata updated with premium: no and stripeCustomerId: ${stripeCustomer.id}`,
      );
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: any) {
      console.error(
        `Failed to create Stripe customer or update user metadata: ${err.message}`,
      );
      return NextResponse.json(
        { error: `Failed to create Stripe customer or update user metadata: ${err.message}` },
        { status: 500 },
      );
    }
  } else {
    return NextResponse.json({ error: "Unhandled event type" }, { status: 400 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: { Allow: "POST" } });
}
