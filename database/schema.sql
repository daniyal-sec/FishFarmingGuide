USE [FishFarmDB]
GO
/****** Object:  UserDefinedFunction [dbo].[CalculateUsedArea]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   FUNCTION [dbo].[CalculateUsedArea] (@FarmId INT)
RETURNS DECIMAL(10,2)
AS
BEGIN
    DECLARE @UsedArea DECIMAL(10,2);

    SELECT @UsedArea = ISNULL(SUM(CAST(Size AS DECIMAL(10,2))), 0)
    FROM Ponds
    WHERE FarmId = @FarmId;

    RETURN @UsedArea;
END
GO
/****** Object:  Table [dbo].[Expense_log]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Expense_log](
	[ExpenseId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NOT NULL,
	[Category] [nvarchar](50) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Description] [nvarchar](max) NULL,
	[ExpenseDate] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[ExpenseId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Farm]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Farm](
	[FarmId] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[TotalAreaAcres] [decimal](10, 2) NULL,
	[SetupDate] [datetime] NULL,
	[RemainingArea]  AS ([TotalAreaAcres]-[dbo].[CalculateUsedArea]([FarmId])),
	[RegionId] [int] NULL,
	[Latitude] [decimal](10, 8) NULL,
	[Longitude] [decimal](11, 8) NULL,
PRIMARY KEY CLUSTERED
(
	[FarmId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Feed_Logs]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Feed_Logs](
	[LogId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NOT NULL,
	[SpeciesID] [int] NOT NULL,
	[FeedTypeUsed] [nvarchar](100) NULL,
	[Quantity_kg] [float] NOT NULL,
	[TotalCost] [decimal](10, 2) NULL,
	[FeedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[LogId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Feed_Rules]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Feed_Rules](
	[RuleId] [int] IDENTITY(1,1) NOT NULL,
	[SpeciesID] [int] NULL,
	[Stage] [nvarchar](20) NULL,
	[MinSize_inch] [float] NULL,
	[MaxSize_inch] [float] NULL,
	[DailyRate_Percent] [float] NULL,
	[ConditionFactor_K] [float] NULL,
	[FeedType] [nvarchar](100) NULL,
	[Frequency] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED
(
	[RuleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Feed_Stock]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Feed_Stock](
	[StockId] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[FeedType] [nvarchar](100) NOT NULL,
	[InitialQuantity_kg] [float] NOT NULL,
	[CurrentQuantity_kg] [float] NOT NULL,
	[CostPerKg] [decimal](10, 2) NOT NULL,
	[TotalCost] [decimal](18, 2) NOT NULL,
	[PurchaseDate] [datetime] NOT NULL,
	[Supplier] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED
(
	[StockId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[fertilizer_recommendations]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[fertilizer_recommendations](
	[RecId] [int] IDENTITY(1,1) NOT NULL,
	[CultivationType] [nvarchar](50) NULL,
	[PondType] [nvarchar](50) NULL,
	[Org_Product] [nvarchar](100) NULL,
	[Org_Dosage_kg_Acre] [float] NULL,
	[Org_Rate_PKR] [float] NULL,
	[Org_Frequency] [nvarchar](100) NULL,
	[Org_Benefits] [nvarchar](max) NULL,
	[Inorg_Product] [nvarchar](100) NULL,
	[Inorg_Dosage_kg_Acre] [float] NULL,
	[Inorg_Rate_PKR] [float] NULL,
	[Inorg_Frequency] [nvarchar](100) NULL,
	[Inorg_Benefits] [nvarchar](max) NULL,
	[Lime_Product] [nvarchar](100) NULL,
	[Lime_Dosage_kg_Acre] [float] NULL,
	[Lime_Rate_PKR] [float] NULL,
	[Lime_Frequency] [nvarchar](100) NULL,
	[Lime_Benefits] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED
(
	[RecId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fertilizer_Stock]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fertilizer_Stock](
	[StockId] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[Category] [nvarchar](100) NOT NULL,
	[ProductName] [nvarchar](255) NOT NULL,
	[InitialQuantity_kg] [float] NOT NULL,
	[CurrentQuantity_kg] [float] NOT NULL,
	[CostPerKg] [decimal](10, 2) NOT NULL,
	[TotalCost] [decimal](18, 2) NOT NULL,
	[PurchaseDate] [datetime] NOT NULL,
	[Supplier] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED
(
	[StockId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Fertilizers_Logs]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Fertilizers_Logs](
	[LogId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NULL,
	[FertilizerType] [nvarchar](50) NULL,
	[ProductName] [nvarchar](100) NULL,
	[QuantityApplied] [float] NULL,
	[TotalCost] [decimal](10, 2) NULL,
	[ApplicationDate] [datetime] NULL,
	[Remarks] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED
(
	[LogId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Harvest_Logs]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Harvest_Logs](
	[HarvestId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [int] NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[Quantity_pieces] [int] NOT NULL,
	[TotalWeight_kg] [float] NOT NULL,
	[Remaining_Pieces] [int] NOT NULL,
	[HarvestDate] [datetime] NULL,
	[Note] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED
(
	[HarvestId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[KnowledgeGuides]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[KnowledgeGuides](
	[GuideId] [int] IDENTITY(1,1) NOT NULL,
	[TabCategory] [nvarchar](100) NOT NULL,
	[Title] [nvarchar](255) NOT NULL,
	[DisplayOrder] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[GuideId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[KnowledgeSections]    Script Date: 04/03/2026 7:11:55 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[KnowledgeSections](
	[SectionId] [int] IDENTITY(1,1) NOT NULL,
	[GuideId] [int] NOT NULL,
	[Title] [nvarchar](255) NOT NULL,
	[ContentText] [nvarchar](max) NULL,
	[DisplayOrder] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[SectionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Marketplace_Listings]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Marketplace_Listings](
	[ListingId] [int] IDENTITY(1,1) NOT NULL,
	[FarmId] [int] NOT NULL,
	[UserId] [int] NOT NULL,
	[StockId] [int] NULL,
	[SpeciesName] [nvarchar](100) NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
	[QuantityAvailable] [int] NOT NULL,
	[PricePerKgOrPiece] [decimal](10, 2) NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[ListingId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Mortality_Logs]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Mortality_Logs](
	[MortalityId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[Quantity_dead] [int] NOT NULL,
	[LogDate] [datetime] NULL,
	[UserId] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[MortalityId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Pond_Inventory]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Pond_Inventory](
	[InventoryId] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[BatchNumber] [nvarchar](50) NULL,
	[Quantity] [int] NOT NULL,
	[WeightPerFish_g] [decimal](10, 2) NULL,
	[CostPerUnit_PKR] [decimal](10, 2) NULL,
	[Supplier] [nvarchar](100) NULL,
	[TotalCost]  AS ([Quantity]*[CostPerUnit_PKR]),
	[StockingDate] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[InventoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Ponds]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Ponds](
	[PondId] [bigint] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[RegionId] [int] NOT NULL,
	[PondName] [nvarchar](100) NOT NULL,
	[CreatedAt] [datetime] NULL,
	[CultureType] [varchar](50) NULL,
	[PondType] [varchar](50) NULL,
	[Size] [float] NULL,
	[Stage] [varchar](100) NULL,
	[FarmId] [int] NULL,
	[CultivationType] [nvarchar](50) NULL,
	[LengthFeet] [int] NULL,
	[WidthFeet] [int] NULL,
	[DepthFeet] [decimal](4, 2) NULL,
	[VolumeLiters] [bigint] NULL,
 CONSTRAINT [PK_Ponds] PRIMARY KEY CLUSTERED
(
	[PondId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Regions]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Regions](
	[RegionId] [int] IDENTITY(1,1) NOT NULL,
	[RegionName] [varchar](100) NOT NULL,
	[Province] [varchar](100) NOT NULL,
	[ClimateType] [varchar](100) NULL,
	[ClimateConditions] [nvarchar](max) NULL,
	[WaterAvailability] [nvarchar](max) NULL,
	[PeakFarmingSeason] [nvarchar](max) NULL,
	[RecommendedPondSize] [nvarchar](255) NULL,
	[CommonChallenges] [nvarchar](max) NULL,
	[ExpertTips] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED
(
	[RegionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Species]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Species](
	[SpeciesId] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](50) NULL,
	[ImageUrl] [nvarchar](max) NULL,
	[MaxStockingDensity] [int] NULL,
	[IsApproved] [bit] NULL,
	[CompatibleRegions] [nvarchar](max) NULL,
	[MinTemp] [decimal](4, 1) NULL,
	[MaxTemp] [decimal](4, 1) NULL,
	[MinPH] [decimal](3, 1) NULL,
	[MaxPH] [decimal](3, 1) NULL,
	[MinDO] [decimal](3, 1) NULL,
	[FingerlingSizeG] [int] NULL,
	[MarketSizeKG] [decimal](3, 1) NULL,
	[HarvestTimeMonths] [int] NULL,
	[FeedingZone] [nvarchar](50) NULL,
	[SurvivalRateLower] [decimal](5, 2) NULL,
	[SurvivalRateUpper] [decimal](5, 2) NULL,
	[MinMarketPrice] [decimal](10, 2) NULL,
	[MaxMarketPrice] [decimal](10, 2) NULL,
	[Description] [nvarchar](max) NULL,
	[SubmittedBy] [int] NULL,
	[IdealDepth] [decimal](4, 2) NULL,
	[WaterVolumeRequirement] [int] NULL,
PRIMARY KEY CLUSTERED
(
	[SpeciesId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SpeciesCompatibility]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SpeciesCompatibility](
	[CompatibilityId] [int] IDENTITY(1,1) NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[CompatibleWithId] [int] NOT NULL,
	[CompatibilityReason] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED
(
	[CompatibilityId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Stocking]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Stocking](
	[StockId] [int] IDENTITY(1,1) NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[Quantity] [int] NOT NULL,
	[PricePerPiece] [decimal](10, 2) NOT NULL,
	[CurrentSizeInches] [decimal](4, 2) NOT NULL,
	[TargetSizeInches] [decimal](4, 2) NOT NULL,
	[StockingDate] [datetime] NULL,
	[TotalInvestment]  AS ([Quantity]*[PricePerPiece]),
	[Status] [nvarchar](20) NULL,
	[OriginalPondId] [bigint] NULL,
	[CurrentPondId] [bigint] NULL,
	[UserId] [int] NOT NULL,
	[LastSizeUpdateDate] [datetime] NULL,
PRIMARY KEY CLUSTERED
(
	[StockId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockingRules]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockingRules](
	[RuleId] [int] IDENTITY(1,1) NOT NULL,
	[Stage] [nvarchar](50) NULL,
	[CultivationType] [nvarchar](50) NULL,
	[MinFishPerAcre] [int] NULL,
	[MaxFishPerAcre] [int] NULL,
	[MaxSpeciesAllowed] [int] NULL,
	[CultureType] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED
(
	[RuleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserId] [int] IDENTITY(1,1) NOT NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[PasswordHash] [nvarchar](max) NOT NULL,
	[FarmName] [nvarchar](100) NULL,
	[Province] [nvarchar](50) NULL,
	[District] [nvarchar](50) NULL,
	[CreatedAt] [datetime] NULL,
	[Role] [nvarchar](20) NULL,
PRIMARY KEY CLUSTERED
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[water_quality_logs]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[water_quality_logs](
	[log_id] [int] IDENTITY(1,1) NOT NULL,
	[PondId] [bigint] NOT NULL,
	[recorded_at] [datetime] NULL,
	[current_temp] [decimal](5, 2) NULL,
	[current_ph] [decimal](4, 2) NULL,
	[current_do] [decimal](5, 2) NULL,
	[current_ammonia] [decimal](5, 2) NULL,
	[current_nitrate] [decimal](5, 2) NULL,
	[current_nitrite] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED
(
	[log_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[water_quality_parameters]    Script Date: 04/03/2026 7:11:56 am ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[water_quality_parameters](
	[water_param_id] [int] IDENTITY(1,1) NOT NULL,
	[RegionId] [int] NOT NULL,
	[SpeciesId] [int] NOT NULL,
	[Name] [nvarchar](100) NULL,
	[min_temp_celsius] [decimal](5, 2) NULL,
	[max_temp_celsius] [decimal](5, 2) NULL,
	[min_ph] [decimal](4, 2) NULL,
	[max_ph] [decimal](4, 2) NULL,
	[min_dissolved_oxygen_ppm] [decimal](5, 2) NULL,
	[max_dissolved_oxygen_ppm] [decimal](5, 2) NULL,
	[min_ammonia_ppm] [decimal](5, 2) NULL,
	[max_ammonia_ppm] [decimal](5, 2) NULL,
	[min_nitrate_ppm] [decimal](5, 2) NULL,
	[max_nitrate_ppm] [decimal](5, 2) NULL,
	[min_nitrite_ppm] [decimal](5, 2) NULL,
	[max_nitrite_ppm] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED
(
	[water_param_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
GO
GO
GO
SET IDENTITY_INSERT [dbo].[Feed_Rules] ON

INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (1, 1, N'Fingerling', 1, 6, 4, 0.01, N'Fine Pellets (30% Protein)', N'3 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (2, 1, N'Grow-out', 6.1, 99, 2, 0.01, N'Floating Pellets (25% Protein)', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (3, 2, N'Fingerling', 1, 6, 5, 0.012, N'High Protein Starter', N'3-4 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (4, 2, N'Grow-out', 6.1, 99, 3, 0.012, N'Standard Pellets', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (5, 3, N'Fingerling', 1, 6, 5, 0.009, N'Small Pellets + Duckweed', N'3 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (6, 3, N'Grow-out', 6.1, 99, 3, 0.009, N'Floating Pellets + Chopped Grass', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (7, 4, N'Fingerling', 1, 6, 3, 0.008, N'Fine Powder Feed', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (8, 4, N'Grow-out', 6.1, 99, 1.5, 0.008, N'Natural Plankton + Supplementary', N'1 time daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (9, 5, N'Fingerling', 1, 6, 4.5, 0.011, N'Sinking Crumbles', N'3 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (10, 5, N'Grow-out', 6.1, 99, 2.5, 0.011, N'Sinking Pellets', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (11, 6, N'Fingerling', 1, 6, 3.5, 0.009, N'Sinking Powder', N'3 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (12, 6, N'Grow-out', 6.1, 99, 2, 0.009, N'Sinking Pellets', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (13, 7, N'Fingerling', 1, 6, 4, 0.011, N'Floating Crumble', N'3 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (14, 7, N'Grow-out', 6.1, 99, 2.5, 0.011, N'Large Floating Pellets', N'2 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (15, 12, N'Fingerling', 1, 5, 5, 0.01, N'Powdered Pelette', N'3-4 times daily')
INSERT [dbo].[Feed_Rules] ([RuleId], [SpeciesID], [Stage], [MinSize_inch], [MaxSize_inch], [DailyRate_Percent], [ConditionFactor_K], [FeedType], [Frequency]) VALUES (16, 12, N'Grow-out', 5, 20, 3, 0.01, N'30', N'2-3 times daily')
SET IDENTITY_INSERT [dbo].[Feed_Rules] OFF
GO
GO
SET IDENTITY_INSERT [dbo].[fertilizer_recommendations] ON

INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (1, N'Intensive', N'Earthen Pond', N'Cow Dung / Poultry Manure', 342, 15, N'Once before stocking, then every 30-45 days', N'Improves soil fertility; Promotes natural food production; Releases nutrients slowly', N'Urea + DAP Mix', 66, 65, N'Every 15-20 days', N'Quick nutrient release; Promotes phytoplankton growth; Increases dissolved oxygen', N'Agricultural Lime', 157, 18, N'As needed (pH < 6.5)', N'Neutralizes soil acidity; Improves nutrient availability; Enhances water quality')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (2, N'Intensive', N'Concrete Pond', N'Fermented Compost', 131, 20, N'Every 20-30 days', N'Sustained nutrient release; Improves water color; Supports beneficial bacteria', N'NPK Fertilizer', 92, 85, N'Every 10-15 days', N'Balanced nutrition; Quick absorption; Promotes algae growth', N'Hydrated Lime', 79, 22, N'Monthly or as needed', N'pH stabilization; Water clarity; Disease prevention')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (3, N'Intensive', N'Lined Pond', N'Bio-compost', 185, 18, N'Bi-weekly', N'Controlled nutrient release; Minimal sediment; Eco-friendly', N'Water-soluble NPK', 79, 95, N'Every 12-15 days', N'Quick dissolving; No residue; Precise dosing', N'Calcium Hydroxide', 105, 25, N'Every 3-4 weeks', N'Fast pH adjustment; Prevents liner damage; Maintains alkalinity')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (4, N'Semi-Intensive', N'Earthen Pond', N'Cow Dung / Poultry Manure', 263, 15, N'Once before stocking, then every 30-45 days', N'Improves soil fertility; Promotes natural food production; Releases nutrients slowly', N'Urea + DAP Mix', 51, 65, N'Every 15-20 days', N'Quick nutrient release; Promotes phytoplankton growth; Increases dissolved oxygen', N'Agricultural Lime', 121, 18, N'As needed (pH < 6.5)', N'Neutralizes soil acidity; Improves nutrient availability; Enhances water quality')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (5, N'Semi-Intensive', N'Concrete Pond', N'Fermented Compost', 101, 20, N'Every 20-30 days', N'Sustained nutrient release; Improves water color; Supports beneficial bacteria', N'NPK Fertilizer', 71, 85, N'Every 10-15 days', N'Balanced nutrition; Quick absorption; Promotes algae growth', N'Hydrated Lime', 61, 22, N'Monthly or as needed', N'pH stabilization; Water clarity; Disease prevention')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (6, N'Semi-Intensive', N'Lined Pond', N'Bio-compost', 142, 18, N'Bi-weekly', N'Controlled nutrient release; Minimal sediment; Eco-friendly', N'Water-soluble NPK', 61, 95, N'Every 12-15 days', N'Quick dissolving; No residue; Precise dosing', N'Calcium Hydroxide', 81, 25, N'Every 3-4 weeks', N'Fast pH adjustment; Prevents liner damage; Maintains alkalinity')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (7, N'Extensive', N'Earthen Pond', N'Cow Dung / Poultry Manure', 184, 15, N'Once before stocking, then every 30-45 days', N'Improves soil fertility; Promotes natural food production; Releases nutrients slowly', N'Urea + DAP Mix', 36, 65, N'Every 15-20 days', N'Quick nutrient release; Promotes phytoplankton growth; Increases dissolved oxygen', N'Agricultural Lime', 85, 18, N'As needed (pH < 6.5)', N'Neutralizes soil acidity; Improves nutrient availability; Enhances water quality')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (8, N'Extensive', N'Concrete Pond', N'Fermented Compost', 71, 20, N'Every 20-30 days', N'Sustained nutrient release; Improves water color; Supports beneficial bacteria', N'NPK Fertilizer', 50, 85, N'Every 10-15 days', N'Balanced nutrition; Quick absorption; Promotes algae growth', N'Hydrated Lime', 43, 22, N'Monthly or as needed', N'pH stabilization; Water clarity; Disease prevention')
INSERT [dbo].[fertilizer_recommendations] ([RecId], [CultivationType], [PondType], [Org_Product], [Org_Dosage_kg_Acre], [Org_Rate_PKR], [Org_Frequency], [Org_Benefits], [Inorg_Product], [Inorg_Dosage_kg_Acre], [Inorg_Rate_PKR], [Inorg_Frequency], [Inorg_Benefits], [Lime_Product], [Lime_Dosage_kg_Acre], [Lime_Rate_PKR], [Lime_Frequency], [Lime_Benefits]) VALUES (9, N'Extensive', N'Lined Pond', N'Bio-compost', 99, 18, N'Bi-weekly', N'Controlled nutrient release; Minimal sediment; Eco-friendly', N'Water-soluble NPK', 43, 95, N'Every 12-15 days', N'Quick dissolving; No residue; Precise dosing', N'Calcium Hydroxide', 57, 25, N'Every 3-4 weeks', N'Fast pH adjustment; Prevents liner damage; Maintains alkalinity')
SET IDENTITY_INSERT [dbo].[fertilizer_recommendations] OFF
GO
GO
GO
SET IDENTITY_INSERT [dbo].[KnowledgeGuides] ON

INSERT [dbo].[KnowledgeGuides] ([GuideId], [TabCategory], [Title], [DisplayOrder]) VALUES (2, N'complete-guides', N'Fingerling Management Guide', 0)
INSERT [dbo].[KnowledgeGuides] ([GuideId], [TabCategory], [Title], [DisplayOrder]) VALUES (4, N'complete-guides', N'Starting Your Fish Farm - Complete Guide', 0)
SET IDENTITY_INSERT [dbo].[KnowledgeGuides] OFF
GO
SET IDENTITY_INSERT [dbo].[KnowledgeSections] ON

INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (1, 2, N'What are Fingerlings?', N'Fingerlings are young fish, usually 2-4 inches long, ready for pond stocking. They are called fingerlings because they are about the size of a human finger. Quality fingerlings are essential for successful fish farming - they determine your harvest quality and survival rate.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (2, 2, N'Selecting Quality Fingerlings', N'
Good fingerlings are: Active and swimming vigorously, uniform in size (same batch), free from injury or deformities, bright in color (species-specific), responsive when disturbed. Avoid fingerlings that are: Sluggish or floating, having white spots or wounds, different sizes in same batch, from overcrowded tanks.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (3, 2, N'Where to Buy Fingerlings?', N'Government hatcheries: Most reliable, certified quality. Cost: PKR 4-8 per piece depending on species. Private hatcheries: Available year-round, check reputation first. Cost: PKR 5-12 per piece. Local fish farmers: Sometimes sell surplus, inspect quality carefully. Best months to buy: March-April (spring season) and July-August (monsoon season).', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (4, 2, N'Transporting Fingerlings', N'
Use clean water from source hatchery. Transport in early morning or evening (cooler temperature). Use oxygen-filled bags for long distances (4+ hours). For short distances (1-2 hours), open containers with aerator work. Stocking density: 100-150 fingerlings per 50L bag. Don''t feed fingerlings 24 hours before transport.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (5, 2, N'Acclimatization Process', N'
Never dump fingerlings directly into pond! Float the transport bag in pond water for 15-20 minutes to equalize temperature. Gradually add pond water to bag (small amounts every 5 minutes). After 30 minutes total, gently release fingerlings into pond. Release near pond edge, not in center. Best time: Early morning or evening when temperature is stable.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (7, 2, N'Initial Care(First 2 Weeks)', N'Don''t feed on first day after stocking. Start light feeding from day 2 (fine powder feed or rice bran). Monitor daily for any mortality - some loss (5-10%) is normal initially. Watch for predators (birds, snakes, frogs). Maintain stable water quality - avoid sudden changes. Keep water depth 3-4 feet in nursery area.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (8, 2, N'Nursery Pond Management', N'
Nursery ponds are special ponds for growing fingerlings safely before moving to main grow-out ponds. Stock at higher density: 50,000-100,000 per acre. Grow for 2-3 months until 4-6 inches size. Smaller pond area makes monitoring easier. Feed 4-5 times daily with high protein feed (35-40%). Keep predators away with netting. Transfer to grow-out ponds when fish reach safe size (4+ inches).', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (9, 2, N'Common FingerLings Problems', N'High mortality (20%+): Check water quality, reduce density, improve aeration. Slow growth: Increase feeding rate, check feed quality, test for diseases. Cannibalism: Separate larger fish, ensure adequate feeding. White spot disease: Treat with salt (5kg/acre) or potassium permanganate. Jumping out of water: Low oxygen - add aeration immediately.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (10, 4, N'Step 1: Site Selection', N'Choose a location with good water supply (canal, tube well, or natural source). The land should be slightly sloping for drainage. Avoid areas with flooding risk. Soil should be clay or clay-loam to hold water.', 0)
INSERT [dbo].[KnowledgeSections] ([SectionId], [GuideId], [Title], [ContentText], [DisplayOrder]) VALUES (13, 4, N'Step 2: Pond Construction', N'For 1 acre pond: Excavate 4-6 feet deep. Make banks 2-3 feet high. Provide inlet and outlet gates. Ensure proper drainage system. Typical cost: PKR 8-12 lakh per acre (earthen pond).', 0)
SET IDENTITY_INSERT [dbo].[KnowledgeSections] OFF
GO
GO
GO
GO
SET IDENTITY_INSERT [dbo].[Regions] ON

INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (1, N'Northern Punjab (Islamabad, Rawalpindi, Gujranwala)', N'Punjab', N'Subtropical', N'Hot summers, mild winters', N'Canal irrigation, tube wells', N'March to October', N'1-3 acres', N'High summer temperatures, water shortage in some areas', N'Use aerators during summer, maintain water level, polyculture recommended')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (2, N'Central Punjab (Lahore, Faisalabad, Sargodha)', N'Punjab', N'Arid/Semi-Arid', N'Hot summers, mild winters', N'Canal irrigation, tube wells', N'March to October', N'1-3 acres', N'High summer temperatures, water shortage in some areas', N'Use aerators during summer, maintain water level, polyculture recommended')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (3, N'Southern Punjab (Multan, Bahawalpur, Rahim Yar Khan)', N'Punjab', N'Arid', N'Hot summers, mild winters', N'Canal irrigation, tube wells', N'March to October', N'1-3 acres', N'High summer temperatures, water shortage in some areas', N'Use aerators during summer, maintain water level, polyculture recommended')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (4, N'Urban Sindh (Karachi, Hyderabad)', N'Sindh', N'Coastal/Humid', N'High temperatures, humid coastal areas', N'Indus river system, brackish water in coastal areas', N'February to November', N'2-5 acres', N'Water salinity in coastal areas, extreme heat', N'Monitor salinity levels, choose saline-tolerant species for coastal regions')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (5, N'Rural Sindh (Larkana, Sukkur, Nawabshah)', N'Sindh', N'Arid', N'High temperatures, humid coastal areas', N'Indus river system, brackish water in coastal areas', N'February to November', N'2-5 acres', N'Water salinity in coastal areas, extreme heat', N'Monitor salinity levels, choose saline-tolerant species for coastal regions')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (6, N'KPK Valleys (Peshawar, Mardan, Swat)', N'KPK', N'Temperate', N'Cold winters, temperate summers', N'Cold springs, river water', N'April to September', N'0.5-2 acres', N'Slow growth in winters, localized flooding', N'Cold-tolerant species like trout in upper regions, protection from flooding')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (7, N'Southern KPK (Dera Ismail Khan, Bannu)', N'KPK', N'Arid', N'Cold winters, temperate summers', N'Cold springs, river water', N'April to September', N'0.5-2 acres', N'Slow growth in winters, localized flooding', N'Cold-tolerant species like trout in upper regions, protection from flooding')
INSERT [dbo].[Regions] ([RegionId], [RegionName], [Province], [ClimateType], [ClimateConditions], [WaterAvailability], [PeakFarmingSeason], [RecommendedPondSize], [CommonChallenges], [ExpertTips]) VALUES (8, N'Balochistan (Quetta, Loralai)', N'Balochistan', N'Highland/Arid', N'Arid, extreme temperature fluctuations', N'Karez system, underground tube wells', N'March to September', N'1-2 acres', N'Limited water availability, high evaporation rates', N'Use water conservation methods, pond shading to reduce evaporation')
SET IDENTITY_INSERT [dbo].[Regions] OFF
GO
SET IDENTITY_INSERT [dbo].[Species] ON

INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (1, N'Rohu', N'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMREhUSEBMVFhIWFhoYFxgWFRcYFRoYGxkXGhgWGRYaHikgGBsmHxUVITEhJSkrMC4uGB83OTMwNygtLisBCgoKDg0OGhAQGy8lHSUtLS0rLS0tMSstLS0tLy0tLS0tKy0tLy0tLS02MC0uLS0tLS0tLTE3Ly0tLS0tKysrLf/AABEIALcBEwMBIgACEQEDEQH/xAAcAAEAAgMBAQEAAAAAAAAAAAAABAUDBgcCAQj/xABDEAABAwIDBQUFBAcHBQEAAAABAAIRAyEEEjEFIkFRYQYTcYGhBzJCkbEjM1JiFHKCksHR8ENTY5OissIkRHN04RX/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAgEDBP/EACoRAQEAAQIEBAYDAQAAAAAAAAABAhHwAxIhMRNBUaEyYXGBkeEiscEE/9oADAMBAAIRAxEAPwDuKIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAip9v4XEPH2FepTtpSZRLp5zVMLlm2O2e0sBUINatUAMRicGxjfKrSdDvRTctF44a9na0XJdle2USBisNA4upOBM/qOt/qXQthdpsLjROHqtceLDu1B4sN1ssTZYuERFrBERAREQEREBfHuAEkwBqTovqoe1eOb3FWiwtdVqMc0N7yk0iQRmIqPbMIJje0GEJyjFUC7l3rJ+qn06rXCWuBHQz9F+Ytp7DxOHJ7+iQ3g4shp/bbufJxUDDV3MMsc6mebXFp8iCufPfR0uE9X6vlF+XaW38XTMsx2KHQ16hHyLiPRbbsP2oY9kB0YgWEFl/AOYBfxlbzxPK7qi0HY/tTw1SBiKVWg4gGSO8ZB6s3h5tC2Kh2wwL4y4mnfmS3/cAq1ZpovEVa3b+FOmJo/5rP5rINs4c6V6P+Yz+a1iciwU8ZTd7r2HwcD9Cs0oPqIiAiIgIiICIiAiIgIiIC1Htr2OGNYTSxFShVvJ7yoaThFw+nmyx1AW3Iss1bLZdY/M+3OxmKw5Jaaddv4sO8PP7TBvD5R1VJgcU5jgWuc17TaDlcD06+HyXbPaJ7OWYnNicG3JiRdzWgQ/qLjK7w18VwzGte15D5zAw4GbEcCHXHguXw3R2s5pzR1Ls37U69IBuKYa7RbMIbVA8dHx1g8yuq7D29h8YzPh6gdzbo9p5OYbtX5fwtfS/9dAb/XwVjhqpY7vaT3U6rLh7TlcDwvrflx4i6rn0c+XV+okXHdhe1qrSAbjqQq2+8pQ1/H3mHdcbcCPBbbhvajs99nPqMP5qZ/4yrllTZY3VFpz/AGnbNF++dET92/QanTgq/F+1rBtkU6dZ5Fvda28TluZmL6aJrDSugrxWqhjS5xAaBJJIAA8TYLkO0PbFUJjD0GtEZgX5nnJxfAgQFqW3O3GKxgy4kzRbvuYGANDD7jiI3jPOYgwsuUbMa33tX7VBTlmDNFztMxcah11a2mCz5v8AJaM7tftDESH1i4EEw+lTLIGtnNy+ipWVKwnM2CMjTENANQnuyOg4oKb3OAlhJf3YvbNTaXO4+64cfBRcvV0mJi8VXuxoY0XJ7trKYLYF9xrc05tFhGz3GO8qCLG0wZyw0EaGHazwPgstDDuqauY0PDqgmBGUxk+fDxWfA4OQyXQMjq45ioC0Bmmu6DGmqm1sxYKWHpUodcgQC4iSHuDTkINiACbxy5qSzE5Mxy71JpLw4mz595h4XDv3l9Zgc2UPnI9hfU1ltWCG/wC0fJZMLsuoe7lhNTNNQcS3MACJ6uny8VPVWkfBXymk0kZQC4OiQXEZgx3U5yAfyhMI4kMBDvecXgROSWjvGGLgtFNw6zFyJlU8BuwRLKrgARIgOY9pki3Xy6rPR2e8CGtJqUqeQSBOWAD4EZWiR18+dt9V6Kl9VzgzKAS95DSTuua2CWEfCZDxpo4KNWxUNeYsHhjhG9TJhuYHQjUx/NbA/ZLnd3LRkdmfyLXgSbgSAC53kOMQYL9mvs4tmqKkm0l7JPvcJFonhEJMi4ql+KcwkESQ0ERYON9D+ISLcbdFKw23K1M7lSq3dklrnN5yDHumykYnBFza4bJpuOZtoDDu3AGgBEeHKQvGK2dUAc5wh/ckDi2o0SCRJkEZgIsbQr576ufL8lhg/aJjqcZcRUMmIfvcrHODe62vZHticIGKoh4/FTOU/umx9FzZ2DyluY7opxJEZgblpPB4ht1gOFe5ofTYO7JImYJg3IHKVvj2dGeFq/Q2yvaFgK8fbd248Koy/wCr3fVbPRqteA5jg5p0III+YX5Iq0XsuT8jP0U3ZHazFYNwdQrOAmLHdJHAtNjqF1x4mOTlcLH6tRcu7H+1ulWhmNaKb/7xl2Hxbq31XTMPiG1Gh9NzXNOhaQQfMLollREQEREBERAREQFxn229n4qMxTQ0NqDK6AAc44k8ZEfuldmXPfbVtFtPBsp6vqVJHQNBzH/U0eajifDXXgfHI4JSpEGJH74+hWcVDe/Ll6cF8ZVvbNB5AfxXkiSYmbA6fFYGy569HTLGTLoz1X87AaweEuab+YHz5LNQolwtGbUwNH07ud4RbyUVjb3+k/kA/el3mrFsgEZiDBboRdo+18MwgeS53KqkjE6kDrdszEfBV+7Z5uk+S9MoOgw6X8DrvtBGIdpxENBVi0gwAfiNsv4hNARHD0Wem0BpgtmJmLxBGJdPAcPGFnP5N5J3QaFFrTmJApiCf/WJEASLXgxyEIyjkP2kS0g1B/gkM7tvUjl+R3NWe6SQ7KGAkP3dKOXMxnmQN3y4rzTd/ehvvBtWRvEQDTpx8R3WkjqdJWTPe99m3De990enhDG8MzmnK7r3oLaIHOJA6aqXhtklwNP4yDRBkiKrIcakcJaJk8iFnw2XdDyCd7vBzeC4Uqc8SIERcT1U+hijR3yA4sb3jo41nQC31AgfiVeJrdN7/wATOHJNd7/1gqbI7wfZsjvC19MXs2lIe3peR1lSqWxZLoA+0eKrZ4ZCZabcf+SsqVY0w52po09SSJdVzEyPwzw13hyCsG1GtDgW/dtAuBYvzRPM+7A1SZTyv9/L9e7bL5z+vn+/ZgwmxmVO8BgtrHMYAllnySeFhpw87ZmbOObUh4Zl6OYWtcZJkzN/MjgFcfpTWlwsG0WixIvmL+PQGI/P4Kpr4qQ1u7e5JIAALYIdqG8ABrb55cum99tPuYz+W99/ZPwuyqUw5u60kke64b8B0fMeEa8RZTAEUpcYcSHQ0/EG8QBJiQbSoFXaoyGZJcTLZN25runlA05Lydqtc6+YN/syBBLsxhkcrkeMaQouV3v7rmM73e+ybX/R8wd3W6DeHOJ9wjLcQZnh+HSFjxQpZnhtFgdOZgJImGsNosZBA8Tz1h4wtB5PYTnIdAI3hAuC3dkT06qHU2i+mACMzS0EAtBsGW68/VJldLrvc6t5ZrNN7vRaE0jTe5rWtkOa6xi5a4kCCDIZB8PFfP8A8ZtR3duktAkBwgDQhuaTP3rjm6Kro7UhwpPDcrZPOBEcOJDj10V3gcZuRoGugmCNbN844q7ejnp1UO3di0QWUmgB1V+W5iGtJzuB1vzPNZMTsCjYAfZsGUOsBuyPd56nndQNsY2MWwtEgOLb3iHt0+inVNrh4yZLA2Jsetp/qy3haaa1z4ktukavtjZTGOLWBpzD5ac+K1Wvs8Gws0cSuhYnDOfD4EZx8+N4XvafZbvWnLYkgtPAHhbiFVznN1ZMbI503YFRjg0gNcWZ2nO1wLeZykwbaFW/ZjtHjcFUb3DnZCQDTu5jv2b3PRbdsvsQGnNUeHGIIAhscjeT4aLdex/Zem2p+kOb7p3J56Zh4DRVjnbdMTKY6NxwNYvpse5pY5zWuLTq0kAlp6iYWdEXdwEREBERAREQR8fjGUabqtVwbTYJc46AL82e0btk7aGIJbu0WS2m06gcXH8xt4WWy+2Xtn31T9EoP+ypnfI+Op48Wt+s8gVyljCTP9eZXLL+V08npwnJObzZ6N9b+Mn0VlgKJJdyiItyJmI6KLQZAvb+vr4+i33sX7PsTji2rVzUML+IiKrx/htIsD+M+UrMpr0jJfOqzB7GzVBBBMmBJJPvjl+YenJXA7G4kCe6qkbvwG95c7zFit8x218NsYGnR2fiDAjvRTzNdxl1ckuOvFaftT2zYghzaNCnTkQ17nOJb1giCQuVwmvWu2EyymuOPT6oI2VUbIAc2pIsRJa83p5h+S48wvDqMWkZYiCL926Q5vi6przWkvx9Z9U1nPcajjJfmOY+eq2zZHaKRkxBLvzG/wA7Ty+S4ZYXvHo5cYy0hBGdocZGYcHVS17R+y2B8ua8vdZzxvQGvE/HXENcJ4wCBA5/K6GDa9uaibuFjqBfNmjX3gfmFX9wbODYDDNNsXJJip9JUJ0sY4LC4wHCk4VP1n1Ik8mtGZSS1lLKHBxFFxmPidV90AdDxPNeaGELBmJJbTEn83eC1uMHmshwZADXOuwEPPOo6e7J/q0hOm9/X8stu9/T8PtHEDdBzHJmpm53qztCJ1j+PRSMPiWsjNJDWljjf78xDup1/eHlG/RX34vDQ7xrzeeokKRTwRJLCd2O9mImrAMdOcdFdy1TJozUMWGBhP8AZSa3HeIsep1PyWMVYa+kWS/MapJ5EyGniTaPJZaGEc/LnsK16o4NImBHDQCV7Zsx5gkwScro1FMaHw0v1KXLTe/n7Em9/b3YqW0DmzBoiuAxoPCBYz6x4LzJANKwNAZ2nQl02nnEFShsuMzTdgjuo58Y9ISlshz7us5pmoeZmSPC3oEx016b3Ohbvfz6olCo57gXOI70nvLaRoOY4DzUZrHBwaXFoaTlIGkS63z0lbNTwIpkud8Y1cQI+KTwVdi9sYSm3J3jXFv4QXZj4x6qpvfsnrd7+qswdJ4eHU6e+CSA4SDlAOc9TyVi6vVeS6Cc4BLWgSQHERGumYqPX7ZNLg6nTEgQMxFieNplRW7RfXGSWiRfKLnnJM9fmrmGWjLZqwYPEZsQKJIFQEkFzgZIMiJNzYW4q/p7Je9znbrbyQTrb3pOk8lh2X2Tw9Nwq1Dmfq0AuJB5kkxPgFZuyZoAcQTYA73kquOWrMZj6vFSgCA24EG3p817o1iSGMzHhlAvI0hXGA7M1KkF5LKfAO9+PDh5ra9n7Np0BFNsHidXHxKrHg+dRnxpOkU+ytgkgGtYfgm5/WI08AtiY0AQBAGgC9Iu+OMxmkea5W9xERUwREQEREBaJ7Qqu0KrDSw3d4ahBFSvWrMZIPBpaXFo62P8bvtftmvhqf8A0+Gr13u0NJjXhvi3MD6ELj+I7H7Y2pVL8RTexs7pxNTKGjpTEkeTQFOXo6cOdda1XHYXBYc71Z2MqC2WkDSw46Gq7fqD9Ro8V52NsbFbRqBmGoAxwY3JRpjq7h4klx6rq/Z/2KYemQ7G1n1j+Bk06fgSDnPkQumYDAUqDBToU206bdGsAAHkFkxXnxI0jsf7LsNhMtTExiK4vcfZMP5WHWObvIBdAARFUmjjbb3fIWOrhmPEPY1w5FoI9VlRaxV1uzmDfZ+Fw7p50aZ/4qO7sds8/wDZYfypMH0CvEWaRXPl6qXD9lMFTM08OxpP4QR9Co+O7J0nEOpbjhpO831utiRTeHje8bOJlPNo1fs1Up6MDmyTumZnUEG/VUr8XQFnVGZhZ0kSSPdJ5EFdTXP+3u38EyadXBHEVh7uallbP/kIzR1avPxOBhOvZ6/+fPPiZcumv0Une0JDg5kznEH+0NjbgIlZ6IogASCGPztuDLiZII8SVy6nsvG1Xl1LDugmzWU6kDoOPzK2HZ3Y3aT4/wCkeOrn93Hk50+iicGOvE0xulrd+9okPbmAz7xM6OiMoPlop+FLXb4Eipuu4gRIHhxt1CptjezzGCTUdTpg6xVe8/LLHqtowHZmvQaWtfTcDzkH6J4GTjeJh6vFLCQ0AD7v3OZGXn6L1icO7I4sDS4tkAmGl/AO6BShszEiAO7sIG9/8XkbFxB1cwcdT/JXOBdEeLHMts9mtpYhxdWex3TvIA6AAQFX0uwGLJEupAc85PoGrsA7PVSd6oweAJ/ks9Ps0346jz4Q0fxV48GzzdMv+qWdp+P25fgewTGGa9fNGoaIHhJk+i2bZmxmMthqLnHnE+G8bBbxhti0GaUwTzdLvqp4EaLp4c83C8e+TVaHZupUM1nBo5N3nHz0Hqr7Z+yqVH7tgB4uN3HzU1FckjlcrRERakREQEREBERAREQEREBERAREQEREBERAREQF8hfUQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREH/2Q==', 600, 1, N'Northern Punjab (Islamabad, Rawalpindi, Gujranwala), Central Punjab (Lahore, Faisalabad, Sargodha), Southern Punjab (Multan, Bahawalpur, Rahim Yar Khan), Urban Sindh (Karachi, Hyderabad), Rural Sindh (Larkana, Sukkur, Nawabshah)', CAST(25.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(8.5 AS Decimal(3, 1)), CAST(4.0 AS Decimal(3, 1)), 3, CAST(0.8 AS Decimal(3, 1)), 10, N'Column', CAST(75.00 AS Decimal(5, 2)), CAST(85.00 AS Decimal(5, 2)), CAST(320.00 AS Decimal(10, 2)), CAST(380.00 AS Decimal(10, 2)), N'Bottom feeder, herbivorous, high market value', NULL, CAST(6.50 AS Decimal(4, 2)), 1000)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (2, N'Tilapia', N'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2YuPi4AzoYFlSUXlY90yO3CXruExaWE8kJw&s', 1000, 1, N'Northern Punjab, Central Punjab, Southern Punjab, Urban Sindh, Rural Sindh, KPK Valleys, Southern KPK, Balochistan', CAST(26.0 AS Decimal(4, 1)), CAST(30.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(8.5 AS Decimal(3, 1)), CAST(4.0 AS Decimal(3, 1)), 2, CAST(0.5 AS Decimal(3, 1)), 6, N'Column', CAST(85.00 AS Decimal(5, 2)), CAST(95.00 AS Decimal(5, 2)), CAST(280.00 AS Decimal(10, 2)), CAST(320.00 AS Decimal(10, 2)), N'Fast growing, hardy, good for beginners', NULL, CAST(4.00 AS Decimal(4, 2)), 500)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (3, N'Grass Carp', N'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEHUOml4GmslvsppYrlKGNX7qqzDEzU10YxQ&s', 500, 1, N'KPK Valleys, Southern KPK, Balochistan', CAST(22.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(8.5 AS Decimal(3, 1)), CAST(5.0 AS Decimal(3, 1)), 5, CAST(1.5 AS Decimal(3, 1)), 12, N'Surface', CAST(80.00 AS Decimal(5, 2)), CAST(90.00 AS Decimal(5, 2)), CAST(300.00 AS Decimal(10, 2)), CAST(350.00 AS Decimal(10, 2)), N'Surface feeder, aquatic weed controller, rapid growth', NULL, CAST(6.00 AS Decimal(4, 2)), 1500)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (4, N'Silver Carp', N'https://5.imimg.com/data5/SELLER/Default/2020/12/DC/LV/TH/48568379/silver-carp-fish-seed.jpg', 500, 1, N'Northern Punjab, Central Punjab, Southern Punjab, Urban Sindh, Rural Sindh, KPK Valleys, Southern KPK, Balochistan', CAST(20.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.8 AS Decimal(3, 1)), CAST(8.8 AS Decimal(3, 1)), CAST(4.0 AS Decimal(3, 1)), 8, CAST(1.2 AS Decimal(3, 1)), 12, N'Surface', CAST(75.00 AS Decimal(5, 2)), CAST(85.00 AS Decimal(5, 2)), CAST(260.00 AS Decimal(10, 2)), CAST(310.00 AS Decimal(10, 2)), N'Surface feeder, phytoplankton consumer, good for water quality', NULL, CAST(5.00 AS Decimal(4, 2)), 1000)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (5, N'Common Carp', N'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSrhK3kQblYoE_GNiZTPhBTI9Zh14C2USQEQ&s', 700, 1, N'Northern Punjab, Central Punjab, Southern Punjab, Urban Sindh, Rural Sindh, KPK Valleys, Southern KPK, Balochistan', CAST(15.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(9.0 AS Decimal(3, 1)), CAST(3.5 AS Decimal(3, 1)), 5, CAST(1.0 AS Decimal(3, 1)), 10, N'Bottom', CAST(85.00 AS Decimal(5, 2)), CAST(95.00 AS Decimal(5, 2)), CAST(250.00 AS Decimal(10, 2)), CAST(300.00 AS Decimal(10, 2)), N'Bottom feeder, omnivorous, extremely hardy species', NULL, CAST(5.00 AS Decimal(4, 2)), 1000)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (6, N'Mrigal', N'https://i0.wp.com/vasanthamorganic.com/wp-content/uploads/2019/11/mrigal-fish.jpg?ssl=1', 500, 1, N'Northern Punjab (Islamabad, Rawalpindi, Gujranwala), Central Punjab (Lahore, Faisalabad, Sargodha), Southern Punjab (Multan, Bahawalpur, Rahim Yar Khan), Urban Sindh (Karachi, Hyderabad), Rural Sindh (Larkana, Sukkur, Nawabshah)', CAST(22.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(8.5 AS Decimal(3, 1)), CAST(4.0 AS Decimal(3, 1)), 3, CAST(0.8 AS Decimal(3, 1)), 10, N'Bottom', CAST(75.00 AS Decimal(5, 2)), CAST(85.00 AS Decimal(5, 2)), CAST(310.00 AS Decimal(10, 2)), CAST(360.00 AS Decimal(10, 2)), N'Bottom feeder, herbivorous, essential member of Indian Major Carps', NULL, CAST(7.00 AS Decimal(4, 2)), 800)
INSERT [dbo].[Species] ([SpeciesId], [Name], [ImageUrl], [MaxStockingDensity], [IsApproved], [CompatibleRegions], [MinTemp], [MaxTemp], [MinPH], [MaxPH], [MinDO], [FingerlingSizeG], [MarketSizeKG], [HarvestTimeMonths], [FeedingZone], [SurvivalRateLower], [SurvivalRateUpper], [MinMarketPrice], [MaxMarketPrice], [Description], [SubmittedBy], [IdealDepth], [WaterVolumeRequirement]) VALUES (7, N'Catla', N'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQh8tOZI6gEk1OyPxFWn59olo042Tle0ft5BQ&s', 500, 1, N'Northern Punjab (Islamabad, Rawalpindi, Gujranwala), Central Punjab (Lahore, Faisalabad, Sargodha), Southern Punjab (Multan, Bahawalpur, Rahim Yar Khan), Urban Sindh (Karachi, Hyderabad), Rural Sindh (Larkana, Sukkur, Nawabshah)', CAST(25.0 AS Decimal(4, 1)), CAST(32.0 AS Decimal(4, 1)), CAST(6.5 AS Decimal(3, 1)), CAST(8.5 AS Decimal(3, 1)), CAST(5.0 AS Decimal(3, 1)), 5, CAST(1.5 AS Decimal(3, 1)), 14, N'Surface', CAST(70.00 AS Decimal(5, 2)), CAST(80.00 AS Decimal(5, 2)), CAST(340.00 AS Decimal(10, 2)), CAST(400.00 AS Decimal(10, 2)), N'Surface feeder, large size, good growth', NULL, CAST(5.50 AS Decimal(4, 2)), 1200)
SET IDENTITY_INSERT [dbo].[Species] OFF
GO
SET IDENTITY_INSERT [dbo].[SpeciesCompatibility] ON

INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (1, 1, 3, N'Rohu (Column) and Grass Carp (Surface/Vegetation) occupy different niches.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (2, 1, 4, N'Rohu (Column) and Silver Carp (Surface) do not compete for food.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (3, 1, 6, N'Classic combination: Rohu (Column) and Mrigal (Bottom).')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (4, 1, 7, N'Standard Polyculture: Rohu (Column) and Catla (Surface).')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (5, 2, 5, N'Tilapia and Common Carp are both hardy and can coexist in mixed systems.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (6, 3, 1, N'Grass Carp (Surface) and Rohu (Column) are highly compatible.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (7, 3, 6, N'Grass Carp (Surface) and Mrigal (Bottom) utilize different food sources.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (8, 3, 7, N'Grass Carp (Vegetation) and Catla (Surface/Plankton) work well together.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (9, 4, 1, N'Silver Carp (Surface) and Rohu (Column) work perfectly together.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (10, 4, 5, N'Silver Carp (Surface) and Common Carp (Bottom) maximize pond volume.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (11, 4, 6, N'Silver Carp (Surface) and Mrigal (Bottom) have no niche overlap.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (12, 5, 4, N'Common Carp (Bottom) and Silver Carp (Surface) cover the whole water column.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (13, 5, 7, N'Common Carp (Bottom) and Catla (Surface) do not compete.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (14, 5, 2, N'Both are hardy species suitable for warmer pond environments.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (15, 6, 1, N'Mrigal (Bottom) and Rohu (Column) is a standard duo.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (16, 6, 7, N'Mrigal (Bottom) and Catla (Surface) stay far apart in the water.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (17, 6, 3, N'Mrigal (Bottom) and Grass Carp (Surface) utilize different feed.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (18, 7, 1, N'Catla (Surface) and Rohu (Column) are the two most common polyculture partners.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (19, 7, 6, N'Catla (Surface) and Mrigal (Bottom) cover top and bottom layers.')
INSERT [dbo].[SpeciesCompatibility] ([CompatibilityId], [SpeciesId], [CompatibleWithId], [CompatibilityReason]) VALUES (20, 7, 3, N'Catla (Surface) and Grass Carp (Surface/Vegetation) have different diets.')
SET IDENTITY_INSERT [dbo].[SpeciesCompatibility] OFF
GO
GO
SET IDENTITY_INSERT [dbo].[StockingRules] ON

INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (1, N'Grown-out', N'Extensive', 800, 2000, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (2, N'Grown-out', N'Semi-Intensive', 3500, 6500, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (3, N'Grown-out', N'Intensive', 7500, 10000, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (4, N'Nursery', N'Extensive', 40000, 80000, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (5, N'Nursery', N'Semi-Intensive', 100000, 200000, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (6, N'Nursery', N'Intensive', 250000, 400000, 3, N'Polyculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (7, N'Grown-out', N'Extensive', 800, 2000, 1, N'Monoculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (8, N'Grown-out', N'Semi-Intensive', 3500, 6500, 1, N'Monoculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (9, N'Grown-out', N'Intensive', 7500, 10000, 1, N'Monoculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (10, N'Nursery', N'Extensive', 40000, 80000, 1, N'Monoculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (11, N'Nursery', N'Semi-Intensive', 100000, 200000, 1, N'Monoculture')
INSERT [dbo].[StockingRules] ([RuleId], [Stage], [CultivationType], [MinFishPerAcre], [MaxFishPerAcre], [MaxSpeciesAllowed], [CultureType]) VALUES (12, N'Nursery', N'Intensive', 250000, 400000, 1, N'Monoculture')
SET IDENTITY_INSERT [dbo].[StockingRules] OFF
GO
GO
GO
SET IDENTITY_INSERT [dbo].[water_quality_parameters] ON

INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (2, 1, 2, N'Tilapia', CAST(22.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.00 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (3, 1, 3, N'Grass Carp', CAST(15.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (4, 1, 4, N'Silver Carp', CAST(18.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (5, 1, 5, N'Common Carp', CAST(15.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (6, 1, 6, N'Mrigal', CAST(20.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (7, 1, 7, N'Catla', CAST(22.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (8, 2, 1, N'Rohu', CAST(20.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (9, 2, 2, N'Tilapia', CAST(20.00 AS Decimal(5, 2)), CAST(38.00 AS Decimal(5, 2)), CAST(6.00 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.12 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (10, 2, 3, N'Grass Carp', CAST(15.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (11, 2, 4, N'Silver Carp', CAST(18.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (12, 2, 5, N'Common Carp', CAST(15.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (13, 2, 6, N'Mrigal', CAST(20.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (14, 2, 7, N'Catla', CAST(22.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (15, 3, 1, N'Rohu', CAST(22.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (16, 3, 2, N'Tilapia', CAST(22.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(6.00 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (17, 3, 3, N'Grass Carp', CAST(18.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (18, 3, 4, N'Silver Carp', CAST(20.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (19, 3, 5, N'Common Carp', CAST(18.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.08 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (20, 3, 6, N'Mrigal', CAST(22.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (21, 3, 7, N'Catla', CAST(22.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (22, 4, 1, N'Rohu', CAST(22.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (23, 4, 2, N'Tilapia', CAST(20.00 AS Decimal(5, 2)), CAST(38.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.20 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (24, 4, 3, N'Grass Carp', CAST(18.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (25, 4, 4, N'Silver Carp', CAST(20.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (26, 4, 5, N'Common Carp', CAST(18.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (27, 4, 6, N'Mrigal', CAST(22.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (28, 4, 7, N'Catla', CAST(22.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (29, 5, 1, N'Rohu', CAST(20.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (30, 5, 2, N'Tilapia', CAST(20.00 AS Decimal(5, 2)), CAST(41.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.50 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.12 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (31, 5, 3, N'Grass Carp', CAST(18.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (32, 5, 4, N'Silver Carp', CAST(20.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (33, 5, 5, N'Common Carp', CAST(18.00 AS Decimal(5, 2)), CAST(36.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.20 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.08 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (34, 5, 6, N'Mrigal', CAST(22.00 AS Decimal(5, 2)), CAST(36.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (35, 5, 7, N'Catla', CAST(22.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (36, 6, 1, N'Rohu', CAST(16.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (37, 6, 2, N'Tilapia', CAST(14.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.50 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.08 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(80.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.15 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (38, 6, 3, N'Grass Carp', CAST(10.00 AS Decimal(5, 2)), CAST(28.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.20 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (39, 6, 4, N'Silver Carp', CAST(12.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (40, 6, 5, N'Common Carp', CAST(8.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.50 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.08 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.15 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (41, 6, 6, N'Mrigal', CAST(16.00 AS Decimal(5, 2)), CAST(31.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (42, 6, 7, N'Catla', CAST(18.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.50 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (43, 7, 1, N'Rohu', CAST(19.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(3.80 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (44, 7, 2, N'Tilapia', CAST(18.00 AS Decimal(5, 2)), CAST(39.00 AS Decimal(5, 2)), CAST(6.00 AS Decimal(4, 2)), CAST(9.20 AS Decimal(4, 2)), CAST(3.00 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(100.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (45, 7, 3, N'Grass Carp', CAST(14.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.60 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (46, 7, 4, N'Silver Carp', CAST(16.00 AS Decimal(5, 2)), CAST(33.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (47, 7, 5, N'Common Carp', CAST(12.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(9.00 AS Decimal(4, 2)), CAST(3.50 AS Decimal(5, 2)), CAST(12.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(60.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.20 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (48, 7, 6, N'Mrigal', CAST(18.00 AS Decimal(5, 2)), CAST(35.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (49, 7, 7, N'Catla', CAST(20.00 AS Decimal(5, 2)), CAST(34.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(4.50 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (50, 8, 1, N'Rohu', CAST(15.00 AS Decimal(5, 2)), CAST(28.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(10.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (51, 8, 2, N'Tilapia', CAST(12.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(4.50 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.06 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(80.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.15 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (52, 8, 3, N'Grass Carp', CAST(8.00 AS Decimal(5, 2)), CAST(26.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.20 AS Decimal(4, 2)), CAST(5.50 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (53, 8, 4, N'Silver Carp', CAST(10.00 AS Decimal(5, 2)), CAST(28.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.50 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.04 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (54, 8, 5, N'Common Carp', CAST(4.00 AS Decimal(5, 2)), CAST(28.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.80 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.06 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(50.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.15 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (55, 8, 6, N'Mrigal', CAST(15.00 AS Decimal(5, 2)), CAST(30.00 AS Decimal(5, 2)), CAST(6.80 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (56, 8, 7, N'Catla', CAST(16.00 AS Decimal(5, 2)), CAST(28.00 AS Decimal(5, 2)), CAST(7.00 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.50 AS Decimal(5, 2)), CAST(11.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.05 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(40.00 AS Decimal(5, 2)), CAST(0.00 AS Decimal(5, 2)), CAST(0.10 AS Decimal(5, 2)))
INSERT [dbo].[water_quality_parameters] ([water_param_id], [RegionId], [SpeciesId], [Name], [min_temp_celsius], [max_temp_celsius], [min_ph], [max_ph], [min_dissolved_oxygen_ppm], [max_dissolved_oxygen_ppm], [min_ammonia_ppm], [max_ammonia_ppm], [min_nitrate_ppm], [max_nitrate_ppm], [min_nitrite_ppm], [max_nitrite_ppm]) VALUES (64, 1, 1, NULL, CAST(25.00 AS Decimal(5, 2)), CAST(32.00 AS Decimal(5, 2)), CAST(6.50 AS Decimal(4, 2)), CAST(8.50 AS Decimal(4, 2)), CAST(5.00 AS Decimal(5, 2)), NULL, NULL, CAST(0.05 AS Decimal(5, 2)), NULL, NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[water_quality_parameters] OFF
GO
/****** Object:  Index [UQ__Farm__1788CC4DBC4C4554]    Script Date: 04/03/2026 7:11:56 am ******/
ALTER TABLE [dbo].[Farm] ADD UNIQUE NONCLUSTERED
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__A9D10534639B8CAA]    Script Date: 04/03/2026 7:11:56 am ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Users__A9D10534E69F257D]    Script Date: 04/03/2026 7:11:56 am ******/
ALTER TABLE [dbo].[Users] ADD UNIQUE NONCLUSTERED
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ_Species_Region]    Script Date: 04/03/2026 7:11:56 am ******/
ALTER TABLE [dbo].[water_quality_parameters] ADD  CONSTRAINT [UQ_Species_Region] UNIQUE NONCLUSTERED
(
	[SpeciesId] ASC,
	[RegionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Expense_log] ADD  DEFAULT (getdate()) FOR [ExpenseDate]
GO
ALTER TABLE [dbo].[Farm] ADD  DEFAULT (getdate()) FOR [SetupDate]
GO
ALTER TABLE [dbo].[Feed_Logs] ADD  DEFAULT (getdate()) FOR [FeedDate]
GO
ALTER TABLE [dbo].[Feed_Stock] ADD  DEFAULT (getdate()) FOR [PurchaseDate]
GO
ALTER TABLE [dbo].[Fertilizer_Stock] ADD  DEFAULT (getdate()) FOR [PurchaseDate]
GO
ALTER TABLE [dbo].[Fertilizers_Logs] ADD  DEFAULT (getdate()) FOR [ApplicationDate]
GO
ALTER TABLE [dbo].[Harvest_Logs] ADD  DEFAULT (getdate()) FOR [HarvestDate]
GO
ALTER TABLE [dbo].[KnowledgeGuides] ADD  DEFAULT ((0)) FOR [DisplayOrder]
GO
ALTER TABLE [dbo].[KnowledgeSections] ADD  DEFAULT ((0)) FOR [DisplayOrder]
GO
ALTER TABLE [dbo].[Marketplace_Listings] ADD  DEFAULT ('Active') FOR [Status]
GO
ALTER TABLE [dbo].[Marketplace_Listings] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Mortality_Logs] ADD  DEFAULT (getdate()) FOR [LogDate]
GO
ALTER TABLE [dbo].[Pond_Inventory] ADD  DEFAULT (getdate()) FOR [StockingDate]
GO
ALTER TABLE [dbo].[Ponds] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Ponds] ADD  DEFAULT ('Semi-Intensive') FOR [CultivationType]
GO
ALTER TABLE [dbo].[Species] ADD  DEFAULT ((0)) FOR [IsApproved]
GO
ALTER TABLE [dbo].[Stocking] ADD  DEFAULT (getdate()) FOR [StockingDate]
GO
ALTER TABLE [dbo].[Stocking] ADD  DEFAULT ('Nursery') FOR [Status]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ('user') FOR [Role]
GO
ALTER TABLE [dbo].[water_quality_logs] ADD  DEFAULT (getdate()) FOR [recorded_at]
GO
ALTER TABLE [dbo].[Expense_log]  WITH CHECK ADD  CONSTRAINT [FK_Expense_Pond] FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Expense_log] CHECK CONSTRAINT [FK_Expense_Pond]
GO
ALTER TABLE [dbo].[Farm]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Farm]  WITH CHECK ADD  CONSTRAINT [FK_Farm_Regions] FOREIGN KEY([RegionId])
REFERENCES [dbo].[Regions] ([RegionId])
GO
ALTER TABLE [dbo].[Farm] CHECK CONSTRAINT [FK_Farm_Regions]
GO
ALTER TABLE [dbo].[Feed_Logs]  WITH CHECK ADD  CONSTRAINT [FK_FeedLog_Pond] FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Feed_Logs] CHECK CONSTRAINT [FK_FeedLog_Pond]
GO
ALTER TABLE [dbo].[Feed_Logs]  WITH CHECK ADD  CONSTRAINT [FK_FeedLog_Species] FOREIGN KEY([SpeciesID])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[Feed_Logs] CHECK CONSTRAINT [FK_FeedLog_Species]
GO
ALTER TABLE [dbo].[Feed_Stock]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Fertilizer_Stock]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Fertilizers_Logs]  WITH CHECK ADD  CONSTRAINT [FK_FertLog_Ponds] FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Fertilizers_Logs] CHECK CONSTRAINT [FK_FertLog_Ponds]
GO
ALTER TABLE [dbo].[KnowledgeSections]  WITH CHECK ADD  CONSTRAINT [FK_KnowledgeSections_KnowledgeGuides] FOREIGN KEY([GuideId])
REFERENCES [dbo].[KnowledgeGuides] ([GuideId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[KnowledgeSections] CHECK CONSTRAINT [FK_KnowledgeSections_KnowledgeGuides]
GO
ALTER TABLE [dbo].[Marketplace_Listings]  WITH CHECK ADD FOREIGN KEY([FarmId])
REFERENCES [dbo].[Farm] ([FarmId])
GO
ALTER TABLE [dbo].[Marketplace_Listings]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Mortality_Logs]  WITH CHECK ADD  CONSTRAINT [FK_Mortality_Pond] FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Mortality_Logs] CHECK CONSTRAINT [FK_Mortality_Pond]
GO
ALTER TABLE [dbo].[Mortality_Logs]  WITH CHECK ADD  CONSTRAINT [FK_Mortality_Species] FOREIGN KEY([SpeciesId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[Mortality_Logs] CHECK CONSTRAINT [FK_Mortality_Species]
GO
ALTER TABLE [dbo].[Pond_Inventory]  WITH CHECK ADD FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Pond_Inventory]  WITH CHECK ADD FOREIGN KEY([SpeciesId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[Ponds]  WITH CHECK ADD  CONSTRAINT [FK_PondRegion] FOREIGN KEY([RegionId])
REFERENCES [dbo].[Regions] ([RegionId])
GO
ALTER TABLE [dbo].[Ponds] CHECK CONSTRAINT [FK_PondRegion]
GO
ALTER TABLE [dbo].[Ponds]  WITH CHECK ADD  CONSTRAINT [FK_Ponds_Farm] FOREIGN KEY([FarmId])
REFERENCES [dbo].[Farm] ([FarmId])
GO
ALTER TABLE [dbo].[Ponds] CHECK CONSTRAINT [FK_Ponds_Farm]
GO
ALTER TABLE [dbo].[Ponds]  WITH CHECK ADD  CONSTRAINT [FK_PondUser] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Ponds] CHECK CONSTRAINT [FK_PondUser]
GO
ALTER TABLE [dbo].[SpeciesCompatibility]  WITH CHECK ADD FOREIGN KEY([CompatibleWithId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[SpeciesCompatibility]  WITH CHECK ADD FOREIGN KEY([SpeciesId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[Stocking]  WITH CHECK ADD  CONSTRAINT [FK_CurrentPond] FOREIGN KEY([CurrentPondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Stocking] CHECK CONSTRAINT [FK_CurrentPond]
GO
ALTER TABLE [dbo].[Stocking]  WITH CHECK ADD  CONSTRAINT [FK_OriginalPond] FOREIGN KEY([OriginalPondId])
REFERENCES [dbo].[Ponds] ([PondId])
GO
ALTER TABLE [dbo].[Stocking] CHECK CONSTRAINT [FK_OriginalPond]
GO
ALTER TABLE [dbo].[Stocking]  WITH CHECK ADD  CONSTRAINT [FK_Stocking_Species] FOREIGN KEY([SpeciesId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[Stocking] CHECK CONSTRAINT [FK_Stocking_Species]
GO
ALTER TABLE [dbo].[Stocking]  WITH CHECK ADD  CONSTRAINT [FK_Stocking_Users] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Stocking] CHECK CONSTRAINT [FK_Stocking_Users]
GO
ALTER TABLE [dbo].[water_quality_logs]  WITH CHECK ADD  CONSTRAINT [FK_Logs_Ponds] FOREIGN KEY([PondId])
REFERENCES [dbo].[Ponds] ([PondId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[water_quality_logs] CHECK CONSTRAINT [FK_Logs_Ponds]
GO
ALTER TABLE [dbo].[water_quality_parameters]  WITH CHECK ADD  CONSTRAINT [FK_WQP_Regions] FOREIGN KEY([RegionId])
REFERENCES [dbo].[Regions] ([RegionId])
GO
ALTER TABLE [dbo].[water_quality_parameters] CHECK CONSTRAINT [FK_WQP_Regions]
GO
ALTER TABLE [dbo].[water_quality_parameters]  WITH CHECK ADD  CONSTRAINT [FK_WQP_Species] FOREIGN KEY([SpeciesId])
REFERENCES [dbo].[Species] ([SpeciesId])
GO
ALTER TABLE [dbo].[water_quality_parameters] CHECK CONSTRAINT [FK_WQP_Species]
GO
ALTER TABLE [dbo].[Mortality_Logs]  WITH CHECK ADD CHECK  (([Quantity_dead]>(0)))
GO
