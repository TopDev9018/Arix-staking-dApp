
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Spin, message, Button, Row, Col, Descriptions, List, Empty, Tooltip, Grid, Statistic as AntdStatistic } from 'antd';
import { ShareAltOutlined, CopyOutlined, UsergroupAddOutlined, DollarCircleOutlined, InfoCircleOutlined, RedoOutlined, TeamOutlined, RiseOutlined, LinkOutlined } from '@ant-design/icons';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { getUserReferralData, getReferralProgramDetails } from '../services/api';
import { USDT_DECIMALS, REFERRAL_LINK_BASE } from '../utils/constants';
import './ReferralPage.css';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const ReferralPage = () => {
    const [referralData, setReferralData] = useState(null);
    const [programDetails, setProgramDetails] = useState({ message: '', plans: [] });
    const [loadingData, setLoadingData] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(true);

    const userFriendlyAddress = useTonAddress();
    const rawAddress = useTonAddress(false);
    const [tonConnectUI] = useTonConnectUI();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const fetchReferralData = useCallback(async (showMessages = false) => {
        if (!rawAddress) {
            setReferralData(null);
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        try {
            const response = await getUserReferralData(rawAddress);
            setReferralData(response.data);
            if (showMessages) message.success('Referral data refreshed!');
        } catch (error) {
            if (showMessages) message.error(error?.response?.data?.message || "Failed to load your referral data.");
            console.error("Fetch referral data error:", error);
            setReferralData(null);
        } finally {
            setLoadingData(false);
        }
    }, [rawAddress]);

    const fetchProgramDetails = useCallback(async (showMessages = false) => {
        setLoadingDetails(true);
        try {
            const response = await getReferralProgramDetails();
            setProgramDetails(response.data || { message: 'Details unavailable.', plans: [] });
            if (showMessages) message.success('Referral program details refreshed!');
        } catch (error) {
            if (showMessages) message.error(error?.response?.data?.message || "Failed to load referral program details.");
            console.error("Fetch program details error:", error);
            setProgramDetails({ message: 'Failed to load details.', plans: [] });
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    useEffect(() => {
        if (userFriendlyAddress) {
            fetchReferralData();
        } else {
            setReferralData(null);
            setLoadingData(false);
        }
        fetchProgramDetails();
    }, [userFriendlyAddress, fetchReferralData, fetchProgramDetails]);

    const handleRefresh = () => {
        if (userFriendlyAddress) {
            fetchReferralData(true);
        }
        fetchProgramDetails(true);
    };

    const copyToClipboard = (textToCopy) => {
        if (!textToCopy) {
            message.error('No link to copy.');
            return;
        }
        navigator.clipboard.writeText(textToCopy)
            .then(() => message.success('Referral link copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                message.error('Failed to copy referral link.');
            });
    };

    const shareReferralLink = () => {
        const linkToShare = referralData?.referralLink || `${REFERRAL_LINK_BASE}?ref=${referralData?.referralCode || userFriendlyAddress}`;
        if (!linkToShare) {
            message.warn('Referral link not available yet.');
            return;
        }

        if (navigator.share) {
            navigator.share({
                title: 'Join ARIX Terminal!',
                text: `Join me on ARIX Terminal to stake ARIX, earn USDT rewards, and play games! Use my referral link: ${linkToShare}`,
                url: linkToShare,
            })
                .then(() => console.log('Referral link shared successfully.'))
                .catch((error) => {
                    console.log('Error sharing referral link:', error);
                    
                    copyToClipboard(linkToShare);
                    message.info('Link copied. You can now share it manually.');
                });
        } else {
            copyToClipboard(linkToShare);
            message.info('Referral link copied! Share it with your friends. (Web Share API not available on this browser/device)');
        }
    };


    if (!userFriendlyAddress && !loadingData) {
        return (
            <div className="referral-page-container">
                <Title level={2} className="page-title">
                    <TeamOutlined style={{ marginRight: 10 }} />
                    Referral Program
                </Title>
                <Card className="dark-theme-card centered-message-card">
                    <UsergroupAddOutlined style={{ fontSize: '48px', color: '#7065F0', marginBottom: '20px' }} />
                    <Title level={4} style={{ color: '#E0E0E5', marginBottom: '12px' }}>Connect Your Wallet</Title>
                    <Paragraph style={{ color: '#A0A0A5', marginBottom: '24px', fontSize: '1rem' }}>
                        Please connect your TON wallet to access your unique referral link, track your network growth, and view your referral earnings.
                    </Paragraph>
                    <Button type="primary" size="large" onClick={() => tonConnectUI.openModal()} icon={<LinkOutlined />}>
                        Connect Wallet
                    </Button>
                </Card>
            </div>
        );
    }

    const referralLinkToDisplay = referralData?.referralLink || (referralData?.referralCode ? `${REFERRAL_LINK_BASE}?ref=${referralData.referralCode}` : (rawAddress ? `${REFERRAL_LINK_BASE}?ref=${rawAddress}` : 'Loading...'));

    return (
        <div className="referral-page-container">
            <Title level={2} className="page-title">
                <TeamOutlined style={{ marginRight: 10 }} />
                Referral Dashboard
            </Title>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <Button icon={<RedoOutlined />} onClick={handleRefresh} loading={loadingData || loadingDetails} disabled={!userFriendlyAddress}>
                    Refresh Data
                </Button>
            </div>

            <Spin spinning={loadingData && !referralData} tip="Loading your referral data..." size="large">
                <Card className="dark-theme-card referral-link-card" bordered={false} style={{ marginBottom: 24 }}>
                    <Title level={4} className="referral-card-title">Your Unique Referral Link</Title>
                    {referralData || rawAddress ? (
                        <>
                            <Paragraph className="referral-link-display">
                                <Text
                                    className="referral-link-text"
                                    copyable={{ text: referralLinkToDisplay, tooltips: ['Copy Link', 'Copied!'], icon: <CopyOutlined style={{color: '#7065F0', marginLeft: 8}}/> }}
                                >
                                    {referralLinkToDisplay}
                                </Text>
                            </Paragraph>
                            <Button
                                type="primary"
                                icon={<ShareAltOutlined />}
                                onClick={shareReferralLink}
                                size="large"
                                className="share-button"
                            >
                                Share Your Link
                            </Button>
                        </>
                    ) : (
                        <Paragraph style={{ color: '#8E8E93' }}>Connect wallet to view your referral link.</Paragraph>
                    )}
                </Card>

                <Row gutter={isMobile ? [16,16] : [24, 24]} style={{ marginTop: '24px' }}>
                    <Col xs={24} md={12}>
                        <Card className="dark-theme-card summary-card" title={<><UsergroupAddOutlined style={{marginRight: 8}} /> Your Network</>}>
                            <AntdStatistic title="Direct Referrals (Level 1)" value={referralData?.l1ReferralCount ?? 0} valueStyle={{color: '#E0E0E5'}} />
                            <AntdStatistic title="Indirect Referrals (Level 2)" value={referralData?.l2ReferralCount ?? 0} valueStyle={{color: '#E0E0E5'}} style={{marginTop: 12}}/>
                            <AntdStatistic title="Total Users Invited" value={referralData?.totalUsersInvited ?? 0} valueStyle={{color: '#7065F0', fontWeight: 'bold'}} style={{marginTop: 12}}/>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card className="dark-theme-card summary-card" title={<><DollarCircleOutlined style={{marginRight: 8}}/> Your Earnings (USDT)</>}>
                            <AntdStatistic title="Level 1 Earnings" value={`$${parseFloat(referralData?.l1EarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#4CAF50'}} />
                            <AntdStatistic title="Level 2 Earnings" value={`$${parseFloat(referralData?.l2EarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#4CAF50'}} style={{marginTop: 12}}/>
                            <AntdStatistic title="Total Referral Earnings" value={`$${parseFloat(referralData?.totalReferralEarningsUsdt ?? 0).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#7065F0', fontWeight: 'bold'}} style={{marginTop: 12}}/>
                        </Card>
                    </Col>
                </Row>
            </Spin>

            <div style={{ marginTop: '32px' }}>
                <Title level={3} className="section-title">
                    <RiseOutlined style={{marginRight: 8}}/>
                    Referral Reward Structure
                </Title>
                <Paragraph style={{color: '#A0A0A5', textAlign: 'center', marginBottom: 20}}>
                    {programDetails.message || 'Earn rewards by inviting new users who stake ARIX. Rewards are based on their chosen plan.'}
                </Paragraph>
                <Spin spinning={loadingDetails} tip="Loading program details..." size="large">
                    {programDetails.plans && programDetails.plans.length > 0 ? (
                        <List
                            grid={{ gutter: isMobile ? 16 : 24, xs: 1, sm: 1, md: 2 }}
                            dataSource={programDetails.plans}
                            renderItem={plan => (
                                <List.Item>
                                    <Card className="dark-theme-card plan-explanation-card">
                                        <Title level={5} className="plan-title">{plan.planTitle}</Title>
                                        <Paragraph className="plan-detail">
                                            <Text strong>Level 1 Reward: </Text>{plan.l1RewardPercentage}
                                        </Paragraph>
                                        <Paragraph className="plan-detail">
                                            <Text strong>Level 2 Reward: </Text>{plan.l2RewardDescription}
                                        </Paragraph>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    ) : !loadingDetails && (
                        <Card className="dark-theme-card">
                            <Empty description={<Text style={{color: '#A0A0A5'}}>Referral program details are currently unavailable. Please check back later.</Text>} />
                        </Card>
                    )}
                </Spin>
            </div>
        </div>
    );
};

export default ReferralPage;