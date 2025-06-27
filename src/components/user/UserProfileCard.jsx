import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Button, Spin, message, Tooltip, Row, Col, Grid, Statistic as AntdStatistic, Alert } from 'antd';
import {
  CopyOutlined, RedoOutlined, GlobalOutlined, DollarCircleOutlined, WalletOutlined,
  LogoutOutlined, InfoCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useNavigate } from 'react-router-dom';
import {
  getJettonWalletAddress, getJettonBalance, fromArixSmallestUnits,
  ARIX_DECIMALS, USDT_DECIMALS, MIN_USDT_WITHDRAWAL_USD_VALUE, TON_EXPLORER_URL
} from '../../utils/tonUtils';
import { requestUsdtWithdrawal, requestArixRewardWithdrawal, getUserProfile } from '../../services/api';

const { Text, Paragraph, Title } = Typography;
const { useBreakpoint } = Grid;

const ARIX_JETTON_MASTER_ADDRESS = import.meta.env.VITE_ARIX_TOKEN_MASTER_ADDRESS;

const UserProfileCard = ({
                           userProfileData,
                           activeStakes,
                           currentArxPrice,
                           onRefreshAllData,
                           isDataLoading,
                           onInitiateUnstakeProcess,
                         }) => {
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);
  const [tonConnectUI] = useTonConnectUI();
  const navigate = useNavigate();

  const [arixWalletBalance, setArixWalletBalance] = useState(0);
  const [loadingArixWalletBalance, setLoadingArixWalletBalance] = useState(false);
  const [isWithdrawUsdtLoading, setIsWithdrawUsdtLoading] = useState(false);
  const [isWithdrawArixLoading, setIsWithdrawArixLoading] = useState(false);
  
  const [localClaimableArix, setLocalClaimableArix] = useState('0');
  const [loadingLocalClaimableArix, setLoadingLocalClaimableArix] = useState(false);

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const formatBalance = (amount, precision) => {
    const number = parseFloat(amount);
    return isNaN(number) ? '0.00' : number.toFixed(precision);
  };

  const fetchArixWalletBalance = useCallback(async (showMsg = false) => {
    console.log("[UserProfileCard] 1. Starting fetchArixWalletBalance. rawAddress:", rawAddress);

    if (!rawAddress || !ARIX_JETTON_MASTER_ADDRESS) {
      console.log("[UserProfileCard] 2. Aborting: Missing rawAddress or ARIX_JETTON_MASTER_ADDRESS.");
      console.log(`   - rawAddress found: ${!!rawAddress}`);
      console.log(`   - ARIX_JETTON_MASTER_ADDRESS found: ${!!ARIX_JETTON_MASTER_ADDRESS} (Value: ${ARIX_JETTON_MASTER_ADDRESS})`);
      setArixWalletBalance(0);
      return;
    }

    setLoadingArixWalletBalance(true);
    console.log("[UserProfileCard] 3. Calling getJettonWalletAddress...");
    try {
      const userArixJettonWallet = await getJettonWalletAddress(rawAddress, ARIX_JETTON_MASTER_ADDRESS);
      
      console.log("[UserProfileCard] 4. Received jetton wallet address:", userArixJettonWallet);

      if (userArixJettonWallet) {
        console.log("[UserProfileCard] 5. Calling getJettonBalance for address:", userArixJettonWallet);
        const balanceSmallestUnits = await getJettonBalance(userArixJettonWallet);
        console.log("[UserProfileCard] 6. Received balance (smallest units):", balanceSmallestUnits.toString());
        
        const finalBalance = fromArixSmallestUnits(balanceSmallestUnits);
        console.log("[UserProfileCard] 7. Final formatted balance:", finalBalance);
        setArixWalletBalance(finalBalance);

        if (showMsg) message.success("ARIX wallet balance refreshed!");
      } else {
        console.log("[UserProfileCard] 5b. Jetton wallet address was null or empty. Setting balance to 0.");
        setArixWalletBalance(0);
      }
    } catch (err) {
      console.error("[UserProfileCard] 8. CRITICAL ERROR in fetchArixWalletBalance:", err);
      setArixWalletBalance(0);
      if (showMsg) message.error("Could not refresh ARIX wallet balance.");
    } finally {
      setLoadingArixWalletBalance(false);
    }
  }, [rawAddress]);

  const fetchLocalClaimableArixBalance = useCallback(async () => {
        if (rawAddress) {
            setLoadingLocalClaimableArix(true);
            try {
                const profileRes = await getUserProfile(rawAddress);
                setLocalClaimableArix(Math.floor(parseFloat(profileRes.data?.claimableArixRewards || 0)).toString());
            } catch (error) {
                // console.error("Error fetching local claimable ARIX:", error);
            } finally {
                setLoadingLocalClaimableArix(false);
            }
        } else {
            setLocalClaimableArix('0');
        }
    }, [rawAddress]);

  useEffect(() => {
    if (rawAddress) {
      fetchArixWalletBalance();
      fetchLocalClaimableArixBalance();
    } else {
      setArixWalletBalance(0);
      setLocalClaimableArix('0');
    }
  }, [rawAddress, fetchArixWalletBalance, fetchLocalClaimableArixBalance]);
  
   useEffect(() => {
      if (userProfileData?.claimableArixRewards) {
        setLocalClaimableArix(Math.floor(parseFloat(userProfileData.claimableArixRewards)).toString());
      }
    }, [userProfileData?.claimableArixRewards]);

  const handleRefreshLocalCardData = () => {
      if(userFriendlyAddress) {
          fetchArixWalletBalance(true);
          fetchLocalClaimableArixBalance();
      }
      if(onRefreshAllData) onRefreshAllData(true);
  };

  const handleWithdrawUsdt = async () => {
    if (!rawAddress || !userProfileData) return;
    const claimableUsdt = parseFloat(userProfileData.claimableUsdtBalance || 0);
    if (claimableUsdt < MIN_USDT_WITHDRAWAL_USD_VALUE) {
      message.warn(`Minimum USDT withdrawal: $${MIN_USDT_WITHDRAWAL_USD_VALUE.toFixed(USDT_DECIMALS)}.`);
      return;
    }
    setIsWithdrawUsdtLoading(true);
    message.loading({ content: 'Processing USDT withdrawal...', key: 'usdtWithdrawCard', duration: 0 });
    try {
      const response = await requestUsdtWithdrawal({ userWalletAddress: rawAddress, amountUsdt: claimableUsdt });
      message.success({ content: response.data.message || "USDT Withdrawal submitted!", key: 'usdtWithdrawCard', duration: 5 });
      if (onRefreshAllData) onRefreshAllData(false);
      fetchLocalClaimableArixBalance();
    } catch (error) {
      message.error({ content: error?.response?.data?.message || "USDT Withdrawal failed.", key: 'usdtWithdrawCard', duration: 5 });
    } finally {
      setIsWithdrawUsdtLoading(false);
    }
  };

  const handleWithdrawArix = async () => {
    if (!rawAddress || !userProfileData || !currentArxPrice || currentArxPrice <= 0) return;
    const claimableArixToWithdraw = parseFloat(localClaimableArix || userProfileData.claimableArixRewards || 0);
    const minArixForWithdrawal = MIN_USDT_WITHDRAWAL_USD_VALUE / currentArxPrice;

    if (claimableArixToWithdraw < minArixForWithdrawal) {
      message.warn(`Minimum ARIX withdrawal ~ ${minArixForWithdrawal.toFixed(ARIX_DECIMALS)} ARIX.`);
      return;
    }
    setIsWithdrawArixLoading(true);
    message.loading({ content: 'Processing ARIX withdrawal...', key: 'arixWithdrawCard', duration: 0 });
    try {
      const response = await requestArixRewardWithdrawal({ userWalletAddress: rawAddress, amountArix: claimableArixToWithdraw });
      message.success({ content: response.data.message || "ARIX Withdrawal submitted!", key: 'arixWithdrawCard', duration: 5 });
      if (onRefreshAllData) onRefreshAllData(false);
      fetchLocalClaimableArixBalance();
    } catch (error) {
      message.error({ content: error?.response?.data?.message || "ARIX Withdrawal failed.", key: 'arixWithdrawCard', duration: 5 });
    } finally {
      setIsWithdrawArixLoading(false);
    }
  };

  const explorerLink = userFriendlyAddress ? `${TON_EXPLORER_URL}/address/${userFriendlyAddress}` : '#';
  const copyUserAddress = () => {
    if (!userFriendlyAddress) return;
    navigator.clipboard.writeText(userFriendlyAddress).then(() => message.success('Wallet address copied!')).catch(() => message.error('Failed to copy.'));
  };

  const totalStakedArix = activeStakes?.reduce((sum, stake) => sum + parseFloat(stake.arixAmountStaked || 0), 0) || 0;
  const totalStakedUsdtEquivalent = currentArxPrice && totalStakedArix > 0 ? (totalStakedArix * currentArxPrice) : 0;
  const claimableUsdtNum = parseFloat(userProfileData?.claimableUsdtBalance || 0);
  const effectiveClaimableArixNum = parseFloat(localClaimableArix || userProfileData?.claimableArixRewards || 0);
  const minArixForWithdrawal = currentArxPrice && currentArxPrice > 0 ? (MIN_USDT_WITHDRAWAL_USD_VALUE / currentArxPrice) : Infinity;

  if (!userFriendlyAddress && !isDataLoading) {
    return (
        <Card className="profile-dashboard-card connect-wallet-prompt">
          <WalletOutlined className="connect-wallet-icon" />
          <Title level={4} className="connect-wallet-title">Connect Your Wallet</Title>
          <Paragraph className="connect-wallet-text">Connect wallet for dashboard, stakes, and rewards.</Paragraph>
          <Button type="primary" size="large" onClick={() => tonConnectUI.openModal()} icon={<LinkOutlined />}>Connect Wallet</Button>
        </Card>
    );
  }

  return (
      <Card className="profile-dashboard-card">
        <Spin spinning={isDataLoading || loadingArixWalletBalance || loadingLocalClaimableArix} tip="Loading details...">
          <Row gutter={isMobile ? [16, 20] : [24, 24]}>
            <Col xs={24} md={24} lg={8} className="dashboard-column">
              <Title level={5} className="dashboard-column-title">Wallet & ARIX Info</Title>
              <Paragraph className="dashboard-text-item ellipsis-text">
                <Text strong className="dashboard-label">Address:</Text>
                <Tooltip title={userFriendlyAddress || 'N/A'}>
                  <Text className="dashboard-value">{isMobile ? `${userFriendlyAddress?.slice(0, 6)}...${userFriendlyAddress?.slice(-4)}` : userFriendlyAddress || 'N/A'}</Text>
                </Tooltip>
                <Button icon={<CopyOutlined />} type="text" size="small" onClick={copyUserAddress} className="dashboard-action-icon" />
              </Paragraph>
              <Paragraph className="dashboard-text-item">
                <Text strong className="dashboard-label">Explorer:</Text>
                <a href={explorerLink} target="_blank" rel="noopener noreferrer" className="dashboard-link"><GlobalOutlined style={{ marginRight: 4 }} />View on Tonscan</a>
              </Paragraph>
              <AntdStatistic title="ARIX Wallet Balance" value={arixWalletBalance.toFixed(ARIX_DECIMALS)} suffix=" ARIX" className="dashboard-statistic"/>
              {currentArxPrice != null && (<Text className="dashboard-value-equivalent">~${(arixWalletBalance * currentArxPrice).toFixed(USDT_DECIMALS)} USD</Text>)}
              
              <div style={{ marginTop: 16, padding: '12px', backgroundColor: 'var(--app-bg-light)', borderRadius: '8px' }}>
                <Title level={6} style={{ margin: 0, marginBottom: 8, color: 'var(--app-primary-color)' }}>Game/Swap Balances</Title>
                <div className="balance-item" style={{ marginBottom: 8 }}>
                  <Text className="balance-label" style={{ fontSize: '12px', color: 'var(--app-text-secondary)' }}>ARIX Balance (Game/Swap):</Text>
                  <Text className="balance-value" strong style={{ marginLeft: 8, color: 'var(--app-text-primary)' }}>{formatBalance(userProfileData?.balance, 4)} ARIX</Text>
                </div>
                <div className="balance-item" style={{ marginBottom: 8 }}>
                  <Text className="balance-label" style={{ fontSize: '12px', color: 'var(--app-text-secondary)' }}>USDT Balance (Game/Swap):</Text>
                  <Text className="balance-value" strong style={{ marginLeft: 8, color: 'var(--app-text-primary)' }}>${formatBalance(userProfileData?.usdt_balance, 2)}</Text>
                </div>
                <div className="balance-item">
                  <Text className="balance-label" style={{ fontSize: '12px', color: 'var(--app-text-secondary)' }}>TON Balance (Game/Swap):</Text>
                  <Text className="balance-value" strong style={{ marginLeft: 8, color: 'var(--app-text-primary)' }}>{formatBalance(userProfileData?.ton_balance, 6)} TON</Text>
                </div>
              </div>
              
              <AntdStatistic title="Current ARIX Price" value={currentArxPrice ? `$${currentArxPrice.toFixed(4)}` : 'Loading...'} valueStyle={{color: '#58D6FF'}} className="dashboard-statistic"/>
            </Col>

            <Col xs={24} md={12} lg={8} className="dashboard-column">
              <Title level={5} className="dashboard-column-title">Staking & Rewards</Title>
              <AntdStatistic title="Total Staked ARIX" value={totalStakedArix.toFixed(ARIX_DECIMALS)} suffix=" ARIX" className="dashboard-statistic"/>
              {currentArxPrice != null && totalStakedArix > 0 && (<Text className="dashboard-value-equivalent">~${totalStakedUsdtEquivalent.toFixed(USDT_DECIMALS)} USD</Text>)}
              
              <div style={{ marginTop: 16 }}>
                <AntdStatistic 
                  title="Claimable USDT (from Staking)" 
                  value={`$${formatBalance(userProfileData?.claimable_usdt_balance, 2)}`} 
                  valueStyle={{ color: '#4CAF50' }} 
                  className="dashboard-statistic claimable" 
                />
                <Button type="primary" icon={<DollarCircleOutlined />} onClick={handleWithdrawUsdt} disabled={claimableUsdtNum < MIN_USDT_WITHDRAWAL_USD_VALUE || isWithdrawUsdtLoading || !userFriendlyAddress} loading={isWithdrawUsdtLoading} block className="dashboard-button withdraw-usdt-button" size="middle">Withdraw USDT Reward</Button>
                {claimableUsdtNum > 0 && claimableUsdtNum < MIN_USDT_WITHDRAWAL_USD_VALUE && <Alert message={`Min. USDT: $${MIN_USDT_WITHDRAWAL_USD_VALUE.toFixed(USDT_DECIMALS)}`} type="warning" showIcon className="mini-alert"/>}
              </div>

              <div style={{marginTop: 16}}>
                <AntdStatistic 
                  title="Claimable ARIX (from Staking)" 
                  value={`${formatBalance(effectiveClaimableArixNum, ARIX_DECIMALS)} ARIX`} 
                  valueStyle={{color: '#FFC107'}} 
                  className="dashboard-statistic claimable"
                />
                <Button onClick={handleWithdrawArix} disabled={!currentArxPrice || effectiveClaimableArixNum < minArixForWithdrawal || isWithdrawArixLoading || !userFriendlyAddress} loading={isWithdrawArixLoading} block className="dashboard-button withdraw-arix-button" size="middle">Withdraw ARIX Rewards</Button>
                {currentArxPrice && effectiveClaimableArixNum > 0 && effectiveClaimableArixNum < minArixForWithdrawal && <Alert message={`Min. ARIX ~ $${MIN_USDT_WITHDRAWAL_USD_VALUE.toFixed(USDT_DECIMALS)}`} type="warning" showIcon className="mini-alert"/>}
              </div>
              
              <Button danger icon={<LogoutOutlined />} onClick={onInitiateUnstakeProcess} disabled={totalStakedArix <= 0 || !userFriendlyAddress} block className="dashboard-button unstake-button" size="middle">Unstake ARIX Now</Button>
              {totalStakedArix > 0 && <Tooltip title="Early unstake penalty applies. USDT rewards unaffected."><Paragraph className="dashboard-note"><InfoCircleOutlined style={{marginRight: 4}} /> Early unstake penalty applies.</Paragraph></Tooltip>}
            </Col>

            <Col xs={24} md={12} lg={8} className="dashboard-column">
                 <Title level={5} className="dashboard-column-title">Overall Summary</Title>
                 <AntdStatistic title="Total ARIX Holdings (Wallet + Staked)" value={(arixWalletBalance + totalStakedArix).toFixed(ARIX_DECIMALS)} suffix=" ARIX" className="dashboard-statistic" />
                 {currentArxPrice != null && <Text className="dashboard-value-equivalent">~${((arixWalletBalance + totalStakedArix) * currentArxPrice).toFixed(USDT_DECIMALS)} USD</Text>}
                 <AntdStatistic title="Total Claimable Value (USDT + ARIX Rewards)" value={`~$${(claimableUsdtNum + (currentArxPrice ? effectiveClaimableArixNum * currentArxPrice : 0)).toFixed(USDT_DECIMALS)}`} valueStyle={{color: '#A3AECF', fontWeight:'bold'}} className="dashboard-statistic"/>
                 
                 <div style={{ marginTop: 16, padding: '12px', backgroundColor: 'var(--app-bg-light)', borderRadius: '8px' }}>
                   <Title level={6} style={{ margin: 0, marginBottom: 8, color: 'var(--app-primary-color)' }}>Game/Swap Summary</Title>
                   <AntdStatistic 
                     title="Total Game/Swap Value" 
                     value={`~$${(
                       parseFloat(userProfileData?.balance || 0) * (currentArxPrice || 0) +
                       parseFloat(userProfileData?.usdt_balance || 0) +
                       parseFloat(userProfileData?.ton_balance || 0) * 2.8 // Rough TON price estimate
                     ).toFixed(2)}`}
                     valueStyle={{color: '#52c41a', fontSize: '16px'}} 
                     className="dashboard-statistic"
                   />
                 </div>
                 
                 <Button icon={<RedoOutlined />} onClick={handleRefreshLocalCardData} loading={isDataLoading || loadingArixWalletBalance || loadingLocalClaimableArix} block className="dashboard-button refresh-button" size="middle" style={{marginTop: 20}}>Refresh Balances</Button>
            </Col>
          </Row>
        </Spin>
      </Card>
  );
};

export default UserProfileCard;
