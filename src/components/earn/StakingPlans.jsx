
import React from 'react';
import { Card, Row, Col, Button, Statistic, Tooltip, Typography, Tag } from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined, PercentageOutlined, CalendarOutlined, DollarOutlined, SendOutlined } from '@ant-design/icons';
import { ARIX_DECIMALS, USDT_DECIMALS } from '../../utils/constants';

const { Title: AntTitle, Text, Paragraph } = Typography;

const StakingPlans = ({ plans, onSelectPlan, currentArxPrice, userFriendlyAddress }) => {
    if (!userFriendlyAddress) {
        
        
    }

    if (!plans || plans.length === 0) {
        return (
            <Card className="dark-theme-card centered-message-card" style={{marginTop: 20}}>
                <InfoCircleOutlined style={{ fontSize: '48px', color: '#7065F0', marginBottom: 20 }} />
                <AntTitle level={4} style={{color: '#E0E0E5'}}>No Staking Plans Available</AntTitle>
                <Paragraph style={{color: '#A0A0A5'}}>
                    There are currently no active staking plans. Please check back later for new opportunities to earn with ARIX.
                </Paragraph>
            </Card>
        );
    }

    return (
        <div className="staking-plans-container">
            <AntTitle level={3} className="section-title staking-plans-title">
                Choose Your Staking Plan
            </AntTitle>
            <Paragraph className="staking-plans-subtitle">
                Stake your ARIX tokens based on a USDT value commitment and earn rewards in USDT, credited to your account monthly.
            </Paragraph>
            <Row gutter={[16, 24]} justify="center">
                {plans.map((plan) => {
                    const minStakeUsdtNum = parseFloat(plan.minStakeUsdt || 0);
                    const maxStakeUsdtNum = parseFloat(plan.maxStakeUsdt || Infinity);

                    
                    const minStakeArixApprox = currentArxPrice && minStakeUsdtNum > 0 && currentArxPrice > 0
                        ? (minStakeUsdtNum / currentArxPrice)
                        : null;
                    const maxStakeArixApprox = currentArxPrice && maxStakeUsdtNum !== Infinity && currentArxPrice > 0
                        ? (maxStakeUsdtNum / currentArxPrice)
                        : null;

                    const displayUsdtApr = parseFloat(plan.fixedUsdtAprPercent || 0).toFixed(USDT_DECIMALS);
                    const displayArixPenalty = parseFloat(plan.arixEarlyUnstakePenaltyPercent || 0).toFixed(2);

                    return (
                        <Col xs={24} sm={12} md={8} key={plan.key || plan.id} className="staking-plan-col">
                            <Card
                                className="dark-theme-card staking-plan-card"
                                hoverable
                                actions={[
                                    <Button
                                        type="primary"
                                        key={`select-${plan.key || plan.id}`}
                                        onClick={() => onSelectPlan(plan)}
                                        icon={<SendOutlined />}
                                        className="select-plan-button"
                                        disabled={!userFriendlyAddress}
                                    >
                                        Select Plan & Stake ARIX
                                    </Button>,
                                ]}
                            >
                                <Tag className="plan-key-tag">{plan.key}</Tag>
                                <AntTitle level={4} className="plan-card-title">{plan.title}</AntTitle>

                                <div className="plan-stat-item">
                                    <Text className="plan-stat-label"><CalendarOutlined /> Lock Duration:</Text>
                                    <Text className="plan-stat-value">{plan.durationDays} Days</Text>
                                </div>

                                <div className="plan-stat-item">
                                    <Text className="plan-stat-label"><DollarOutlined /> Stake Range (USDT Value):</Text>
                                    <Text className="plan-stat-value">
                                        ${minStakeUsdtNum.toFixed(USDT_DECIMALS)}
                                        {maxStakeUsdtNum !== Infinity ? ` - $${maxStakeUsdtNum.toFixed(USDT_DECIMALS)}` : '+'}
                                    </Text>
                                    {minStakeArixApprox !== null && (
                                        <Text className="plan-stat-sub-value">
                                            (Approx. {minStakeArixApprox.toFixed(2)}
                                            {maxStakeArixApprox !== null ? ` - ${maxStakeArixApprox.toFixed(2)}` : '+'} ARIX)
                                        </Text>
                                    )}
                                </div>

                                <div className="plan-stat-item">
                                    <Text className="plan-stat-label"><PercentageOutlined /> USDT Reward APR:</Text>
                                    <Text className="plan-stat-value success-text">{displayUsdtApr}%</Text>
                                    <Text className="plan-stat-sub-value">(Calculated on initial USDT value, paid monthly)</Text>
                                </div>

                                <div className="plan-stat-item">
                                    <Text className="plan-stat-label">
                                        <Tooltip title="Penalty on ARIX principal if unstaked before term ends. USDT rewards are not affected by this.">
                                            ARIX Early Unstake Penalty <InfoCircleOutlined className="info-icon"/>
                                        </Tooltip>:
                                    </Text>
                                    <Text className="plan-stat-value error-text">{displayArixPenalty}%</Text>
                                </div>

                                <div className="plan-referral-info">
                                    <Text strong className="referral-info-title">Referral Bonuses:</Text>
                                    <Text className="referral-detail">L1: {plan.referralL1InvestPercent}% of investment</Text>
                                    {plan.referralL2InvestPercent > 0 &&
                                        <Text className="referral-detail">L2: {plan.referralL2InvestPercent}% of L2's investment</Text>
                                    }
                                    {plan.referralL2CommissionOnL1BonusPercent > 0 &&
                                        <Text className="referral-detail">L2: {plan.referralL2CommissionOnL1BonusPercent}% of L1's bonus from L2's investment</Text>
                                    }
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

export default StakingPlans;
