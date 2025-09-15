import mongoose, { Schema, Document, models, model } from 'mongoose'

export interface IRegionalFee {
  region: string
  fee: number
}

export interface ISetting extends Document {
  taxRate: number // e.g. 0.075 for 7.5%
  deliveryFeeDefault: number // default delivery fee in smallest currency unit
  deliveryFeeByRegion: IRegionalFee[]
  updatedAt: Date
  createdAt: Date
}

const RegionalFeeSchema = new Schema<IRegionalFee>({
  region: { type: String, required: true, trim: true },
  fee: { type: Number, required: true, min: 0 },
}, { _id: false })

const SettingSchema = new Schema<ISetting>({
  taxRate: { type: Number, default: 0, min: 0 },
  deliveryFeeDefault: { type: Number, default: 0, min: 0 },
  deliveryFeeByRegion: { type: [RegionalFeeSchema], default: [] },
}, { timestamps: true })

export const Setting = models.Setting || model<ISetting>('Setting', SettingSchema)
