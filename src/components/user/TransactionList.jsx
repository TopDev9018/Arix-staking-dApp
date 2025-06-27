import React from 'react';
import { List, Card, Typography, Empty, Spin, Tag, Row, Col, Grid, Tooltip, Button } from 'antd';
import {
    InfoCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, StopOutlined,
    IssuesCloseOutlined, LoadingOutlined, CopyOutlined, LogoutOutlined
} from '@ant-design/icons';
import { ARIX_DECIMALS, USDT_DECIMALS, TON_EXPLORER_URL } from '../../utils/tonUtils'; // Ensure tonUtils path is correct

const { Text, Paragraph, Title } = Typography;
const { useBreakpoint } = Grid;

const getStakeStatusTag = (status) => {
    const s = status?.toLowerCase() || 'unknown';
    let color = 'default'; // Will be styled by theme
    let icon = <InfoCircleOutlined />;
    let text = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

    if (s === 'active') { color = 'success'; icon = <CheckCircleOutlined />; }
    else if (s === 'pending_confirmation') { color = 'processing'; icon = <LoadingOutlined />; text = "Pending Stake"; }
    else if (s === 'pending_arix_unstake_confirmation') { color = 'warning'; icon = <ClockCircleOutlined />; text = "Pending Unstake"; }
    else if (s === 'completed_arix_unstaked') { color = 'blue'; icon = <CheckCircleOutlined />; text = "Unstaked"; }
    else if (s === 'early_arix_unstaked') { color = 'volcano'; icon = <IssuesCloseOutlined />; text = "Unstaked (Early)"; }
    else if (s.includes('failed')) { color = 'error'; icon = <StopOutlined />; text = "Failed"; }

    return <Tag icon={icon} color={color} className="status-tag">{text}</Tag>;
};

export const renderStakeHistoryItem = (stake, isMobile, onUnstakeClick) => {
    const explorerBaseUrl = TON_EXPLORER_URL;
    const canUnstake = stake.status === 'active' && onUnstakeClick;
    const isReadyToUnstakeFullTerm = stake.status === 'active' && stake.remainingDays <= 0;

    return (
        <div className="stake-history-item">
            <Row justify="space-between" align="middle" gutter={8} className="stake-item-header">
                <Col flex="auto">
                    <Title level={5} className="stake-item-title">
                        {stake.planTitle || `Stake ID: ${stake.id?.substring(0, 8)}...`}
                    </Title>
                    <Text className="stake-item-subtitle">
                        Duration: {stake.planDurationDays} Days
                        {(stake.status === 'active' && stake.remainingDays > 0) && ` (${stake.remainingDays} days left)`}
                        {(stake.status === 'active' && stake.remainingDays <= 0) && ` (Ready to unstake ARIX)`}
                    </Text>
                </Col>
                <Col style={{ textAlign: 'right' }}>{getStakeStatusTag(stake.status)}</Col>
            </Row>
            <Row gutter={isMobile ? [12, 12] : [16, 16]} className="stake-item-details">
                <Col xs={24} sm={12} md={8}><Paragraph className="history-detail-item"><Text strong className="history-label">ARIX Staked:</Text><Text className="history-value highlight-value">{parseFloat(stake.arixAmountStaked || 0).toFixed(ARIX_DECIMALS)} ARIX</Text><Text className="history-sub-value">(${parseFloat(stake.referenceUsdtValueAtStakeTime || 0).toFixed(USDT_DECIMALS)} at stake)</Text>{stake.currentUsdtValueOfStakedArix && stake.currentUsdtValueOfStakedArix !== 'N/A' &&<Text className="history-sub-value">(Current: ~${stake.currentUsdtValueOfStakedArix} USD)</Text>}</Paragraph></Col>
                <Col xs={24} sm={12} md={8}><Paragraph className="history-detail-item"><Text strong className="history-label">USDT APR:</Text><Text className="history-value success-value">{parseFloat(stake.fixedUsdtAprPercent || 0).toFixed(2)}%</Text><Text className="history-sub-value">Accrued: ${parseFloat(stake.usdtRewardAccruedTotal || 0).toFixed(USDT_DECIMALS)} USDT</Text></Paragraph></Col>
                <Col xs={24} sm={12} md={8}><Paragraph className="history-detail-item"><Text strong className="history-label">Early Unstake Penalty:</Text><Text className="history-value error-value">{parseFloat(stake.arixEarlyUnstakePenaltyPercent || 0).toFixed(2)}%</Text>{parseFloat(stake.arixPenaltyApplied || 0) > 0 &&<Text className="history-sub-value">Applied: {parseFloat(stake.arixPenaltyApplied).toFixed(ARIX_DECIMALS)} ARIX</Text>}</Paragraph></Col>
            </Row>
            <Row gutter={[8,8]} className="stake-item-footer" align="middle">
                <Col xs={24} sm={canUnstake ? 16 : 24} md={canUnstake ? 18 : 24}><Text className="history-timestamp">Staked: {new Date(stake.stakeTimestamp).toLocaleString()}</Text>{stake.unlockTimestamp && (<Text className="history-timestamp" style={{display: 'block'}}>Unlocks: {new Date(stake.unlockTimestamp).toLocaleString()}</Text>)}</Col>
                {canUnstake && (<Col xs={24} sm={8} md={6} style={{textAlign: isMobile ? 'left' : 'right', marginTop: isMobile ? 10 : 0}}><Button danger={!isReadyToUnstakeFullTerm} type={isReadyToUnstakeFullTerm ? "primary" : "default"} onClick={() => onUnstakeClick(stake)} size="small" icon={<LogoutOutlined />} className="unstake-button-in-list">{isReadyToUnstakeFullTerm ? 'Unstake ARIX' : 'Unstake Early'}</Button></Col>)}
            </Row>
            {stake.onchainStakeTxHash && (<Paragraph className="history-tx-hash"><Text strong className="history-label">Stake Tx:</Text><a href={`${explorerBaseUrl}/transaction/${stake.onchainStakeTxHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link">{stake.onchainStakeTxHash.substring(0, isMobile ? 6 : 10)}...{stake.onchainStakeTxHash.substring(stake.onchainStakeTxHash.length - (isMobile ? 4 : 6))}</a><Tooltip title="Copy Tx Hash"><Button icon={<CopyOutlined/>} type="text" size="small" onClick={() => navigator.clipboard.writeText(stake.onchainStakeTxHash)} className="copy-tx-button"/></Tooltip></Paragraph>)}
            {stake.onchainUnstakeTxHash && (<Paragraph className="history-tx-hash"><Text strong className="history-label">Unstake Tx:</Text><a href={`${explorerBaseUrl}/transaction/${stake.onchainUnstakeTxHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link">{stake.onchainUnstakeTxHash.substring(0, isMobile ? 6 : 10)}...{stake.onchainUnstakeTxHash.substring(stake.onchainUnstakeTxHash.length - (isMobile ? 4 : 6))}</a><Tooltip title="Copy Tx Hash"><Button icon={<CopyOutlined/>} type="text" size="small" onClick={() => navigator.clipboard.writeText(stake.onchainUnstakeTxHash)} className="copy-tx-button"/></Tooltip></Paragraph>)}
        </div>
    );
};

export const renderCoinflipHistoryItem = (game, isMobile) => {
    return (
        <div className="game-history-item">
            <Row justify="space-between" align="middle" gutter={8} className="game-item-header">
                <Col><Text strong className={game.outcome === 'win' ? 'game-win-text' : 'game-loss-text'}>{game.outcome === 'win' ? 'VICTORY' : 'DEFEAT'}</Text></Col>
                <Col><Text className="game-item-choice-info">You Chose: <Tag className="choice-tag">{game.choice?.toUpperCase()}</Tag> Coin Was: <Tag className="choice-tag">{game.server_coin_side?.toUpperCase()}</Tag></Text></Col>
            </Row>
            <Paragraph className="history-detail-item"><Text strong className="history-label">Bet Amount:</Text><Text className="history-value">{parseFloat(game.bet_amount_arix).toFixed(ARIX_DECIMALS)} ARIX</Text></Paragraph>
            <Paragraph className="history-detail-item"><Text strong className="history-label">Result (Profit/Loss):</Text><Text strong className={parseFloat(game.amount_delta_arix) >= 0 ? 'game-win-text' : 'game-loss-text'}>{parseFloat(game.amount_delta_arix) >= 0 ? '+' : ''}{parseFloat(game.amount_delta_arix).toFixed(ARIX_DECIMALS)} ARIX</Text></Paragraph>
            <Paragraph className="history-timestamp" style={{marginTop: 8}}>Played At: {new Date(game.played_at).toLocaleString()}</Paragraph>
            {game.game_id && (<Paragraph className="history-tx-hash small-text">Game ID: <Text className="explorer-link">{game.game_id.toString().substring(0,isMobile ? 10: 15)}...</Text><Tooltip title="Copy Game ID"><Button icon={<CopyOutlined/>} type="text" size="small" onClick={() => navigator.clipboard.writeText(game.game_id.toString())} className="copy-tx-button"/></Tooltip></Paragraph>)}
        </div>
    );
};

// NEW: Enhanced transaction renderer with support for new transaction types
export const renderTransactionHistoryItem = (tx, isMobile) => {
    const formatAmount = (amount, currency = 'ARIX') => {
        const num = parseFloat(amount);
        if (isNaN(num)) return `0.00 ${currency}`;
        const precision = currency === 'TON' ? 8 : (currency === 'USDT' ? 2 : 4);
        return `${num > 0 ? '+' : ''}${num.toFixed(precision)} ${currency}`;
    };

    const parseMetadata = (metadata) => {
        try {
            if (typeof metadata === 'string') {
                return JSON.parse(metadata);
            } else if (typeof metadata === 'object' && metadata !== null) {
                return metadata;
            }
        } catch (e) {
            console.error("Failed to parse transaction metadata:", metadata);
        }
        return {};
    };

    const renderTransactionDetails = (transaction) => {
        const metadata = parseMetadata(transaction.metadata);
        
        switch (transaction.type) {
            case 'swap':
                return (
                    <>
                        <Title level={5} className="transaction-item-title">Token Swap</Title>
                        <Text className="transaction-item-subtitle">
                            Swapped {metadata.from || '...'} for {metadata.to || '...'}
                        </Text>
                    </>
                );
            
            case 'game_plinko':
                const netAmount = parseFloat(transaction.amount);
                return (
                    <>
                        <Title level={5} className="transaction-item-title">
                            Plinko {netAmount >= 0 ? 'Win' : 'Bet'}
                        </Title>
                        <Text className="transaction-item-subtitle">
                            Bet {metadata.bet?.toFixed(2)} ARIX, Multiplier: {metadata.multiplier?.toFixed(2)}x
                        </Text>
                    </>
                );
            
            case 'game_bet':
                return (
                    <>
                        <Title level={5} className="transaction-item-title">
                            {metadata.game || 'Game'} Bet
                        </Title>
                        <Text className="transaction-item-subtitle">
                            Placed a bet of {Math.abs(transaction.amount).toFixed(2)} ARIX
                        </Text>
                    </>
                );
            
            case 'game_win':
                return (
                    <>
                        <Title level={5} className="transaction-item-title">
                            {metadata.game || 'Game'} Win
                        </Title>
                        <Text className="transaction-item-subtitle">
                            Won {transaction.amount.toFixed(2)} ARIX
                        </Text>
                    </>
                );
            
            case 'stake':
                return (
                    <>
                        <Title level={5} className="transaction-item-title">Staked ARIX</Title>
                        <Text className="transaction-item-subtitle">
                            Staked {Math.abs(transaction.amount).toFixed(ARIX_DECIMALS)} ARIX
                        </Text>
                    </>
                );
            
            case 'stake_reward':
                return (
                    <>
                        <Title level={5} className="transaction-item-title">Staking Reward Claimed</Title>
                        <Text className="transaction-item-subtitle">
                            Claimed {transaction.amount.toFixed(USDT_DECIMALS)} USDT reward
                        </Text>
                    </>
                );
            
            default:
                return (
                    <>
                        <Title level={5} className="transaction-item-title">
                            {transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Title>
                        <Text className="transaction-item-subtitle">
                            Transaction completed
                        </Text>
                    </>
                );
        }
    };

    const isPositive = parseFloat(tx.amount) >= 0;
    const currency = parseMetadata(tx.metadata)?.currency || 'ARIX';

    return (
        <div className="transaction-history-item">
            <Row justify="space-between" align="middle" gutter={8} className="transaction-item-header">
                <Col flex="auto">
                    {renderTransactionDetails(tx)}
                </Col>
                <Col style={{ textAlign: 'right' }}>
                    <Tag color={isPositive ? 'success' : 'error'} className="amount-tag">
                        {formatAmount(tx.amount, currency)}
                    </Tag>
                </Col>
            </Row>
            <Row className="transaction-item-footer">
                <Col span={24}>
                    <Text className="history-timestamp">
                        {new Date(tx.created_at || tx.timestamp).toLocaleString()}
                    </Text>
                </Col>
            </Row>
            {(tx.transaction_hash || tx.id) && (
                <Paragraph className="history-tx-hash">
                    <Text strong className="history-label">
                        {tx.transaction_hash ? 'Tx Hash:' : 'ID:'}
                    </Text>
                    <Text className="explorer-link">
                        {(tx.transaction_hash || tx.id.toString()).substring(0, isMobile ? 8 : 12)}...
                        {(tx.transaction_hash || tx.id.toString()).substring(
                            (tx.transaction_hash || tx.id.toString()).length - (isMobile ? 4 : 6)
                        )}
                    </Text>
                    <Tooltip title={tx.transaction_hash ? "Copy Tx Hash" : "Copy ID"}>
                        <Button 
                            icon={<CopyOutlined/>} 
                            type="text" 
                            size="small" 
                            onClick={() => navigator.clipboard.writeText(tx.transaction_hash || tx.id.toString())} 
                            className="copy-tx-button"
                        />
                    </Tooltip>
                </Paragraph>
            )}
        </div>
    );
};

const TransactionList = ({ items, isLoading, renderItemDetails, listTitle, itemType, listStyle, onUnstakeItemClick }) => {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    if (isLoading) {
        return (<div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" tip={`Loading ${itemType || 'history'}...`} /></div>);
    }
    if (!items || items.length === 0) {
        return (
            <Card className="transaction-list-card empty-list-card" style={{marginTop: 0, ...listStyle}}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Paragraph className="text-secondary-light" style={{fontSize: '1rem'}}>No {itemType || 'history'} found.{itemType === 'staking activity' && ' Explore Earn page.'}{itemType === 'Coinflip game' && ' Try Game Center.'}{itemType === 'transactions' && ' Start trading or gaming.'}</Paragraph>}/>
            </Card>
        );
    }
    return (
        <Card className="transaction-list-card" title={listTitle ? <Title level={4} className="transaction-list-title">{listTitle}</Title> : null} style={{marginTop: listTitle ? 20 : 0, ...listStyle}}>
            <List
                itemLayout="vertical"
                dataSource={items}
                renderItem={(item, index) => (<List.Item key={item.id || item.game_id || item.stake_id || item.transaction_hash || index} className="transaction-list-item-wrapper">{renderItemDetails(item, isMobile, itemType === 'staking activity' ? onUnstakeItemClick : undefined)}</List.Item>)}
                pagination={items.length > (isMobile ? 3:5) ? { pageSize: isMobile ? 3 : 5, align: 'center', hideOnSinglePage: true, showSizeChanger: false, simple: isMobile, className: 'dark-theme-pagination'} : false}
            />
        </Card>
    );
};

TransactionList.defaultProps = {
    items: [], isLoading: false, listTitle: null, itemType: 'items', listStyle: {}, onUnstakeItemClick: null,
};

export default TransactionList;