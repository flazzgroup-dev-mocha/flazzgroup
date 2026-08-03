/**
 * Clean aliases for the generated Prisma row types.
 *
 * Prisma 7 exports these as `BrandModel`, `FaqModel` and so on. Re-exporting
 * them here keeps that naming detail in one file, so a future generator change
 * is a one-line fix instead of a repo-wide rename.
 */
export type {
  AdminModel as Admin,
  ActivityLogModel as ActivityLog,
  BrandModel as Brand,
  CommunityLinkModel as CommunityLink,
  FaqModel as Faq,
  FeatureModel as Feature,
  HeroBannerModel as HeroBanner,
  HeroStatModel as HeroStat,
  PaymentMethodModel as PaymentMethod,
  PopularServiceModel as PopularService,
  ProductModel as Product,
  WebsiteSettingsModel as WebsiteSettings,
  AuthorModel as Author,
  BlogCategoryModel as BlogCategory,
  BlogTagModel as BlogTag,
  BlogImageModel as BlogImage,
  BlogPostModel as BlogPost,
   
} from "../generated/prisma/models";
