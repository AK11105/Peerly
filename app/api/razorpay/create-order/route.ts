import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// ₹99 one-time pro upgrade
const AMOUNT_PAISE = 9900

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await razorpay.orders.create({
    amount: AMOUNT_PAISE,
    currency: 'INR',
    receipt: `pro_${Date.now()}`,
  })

  return NextResponse.json({ orderId: order.id, amount: AMOUNT_PAISE })
}
