"""Analytics and AI insights schemas matching frontend types exactly."""
from typing import List, Optional
from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category: str
    count: int


class DistrictDistributionItem(BaseModel):
    district: str
    count: int
    highRisk: bool


class WeeklyTrendItem(BaseModel):
    day: str
    total: int
    emergency: int
    resolved: int


class OfficerPerformanceItem(BaseModel):
    name: str
    badge: str
    resolved: int
    active: int
    rating: float


class AnalyticsSummaryOut(BaseModel):
    """Matches frontend AnalyticsSummary type."""
    totalComplaints: int
    resolvedComplaints: int
    pendingComplaints: int
    emergencyCases: int
    clearanceRate: float
    avgResponseTimeMin: float
    fakeReportsDetected: int
    duplicatesFlagged: int
    activePatrolUnits: int
    categoryBreakdown: List[CategoryBreakdownItem]
    districtDistribution: List[DistrictDistributionItem]
    weeklyTrend: List[WeeklyTrendItem]
    officerPerformance: List[OfficerPerformanceItem]


class DistrictRiskItem(BaseModel):
    district: str
    riskScore: float
    keyCrime: str
    recommendedAction: str


class HotspotPredictionItem(BaseModel):
    locationName: str
    lat: float
    lng: float
    timeWindow: str
    probability: float


class SuspiciousPatternItem(BaseModel):
    title: str
    detail: str
    severity: str


class FakeComplaintSummary(BaseModel):
    totalAnalyzed: int
    flaggedCount: int
    commonMarkers: List[str]


class AIInsightsDataOut(BaseModel):
    """Matches frontend AIInsightsData type."""
    crimeTrendSummary: str
    districtRiskAnalysis: List[DistrictRiskItem]
    hotspotPredictions: List[HotspotPredictionItem]
    suspiciousPatterns: List[SuspiciousPatternItem]
    fakeComplaintSummary: FakeComplaintSummary
