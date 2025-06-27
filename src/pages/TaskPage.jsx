import React, { useState, useEffect, useCallback } from 'react';
import { List, Card, Button, Typography, Spin, message, Modal, Input, Empty, Tag, Tooltip, Row, Col, Grid, Alert, Form } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, LinkOutlined, SendOutlined, RedoOutlined, ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, CloseOutlined } from '@ant-design/icons';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { getActiveTasks, submitTaskCompletion, getUserTaskHistory, getUserProfile, withdrawArix } from '../services/api';
import { ARIX_DECIMALS } from '../utils/tonUtils';
import { useNavigate } from 'react-router-dom';
import './TaskPage.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// --- REUSABLE MODAL COMPONENTS ---
const ArixPushIcon = () => (
    <img src="/img/arix-diamond.png" alt="ARIX" className="push-page-arix-icon" onError={(e) => { e.currentTarget.src = '/img/fallback-icon.png'; }} />
);

const HOT_WALLET_ADDRESS = import.meta.env.VITE_HOT_WALLET_ADDRESS;

const copyToClipboard = (textToCopy, successMessage = 'Copied to clipboard!') => {
    if (!textToCopy) {
        message.error('Nothing to copy.');
        return;
    }
    navigator.clipboard.writeText(textToCopy)
        .then(() => message.success(successMessage))
        .catch(err => {
            console.error('Failed to copy: ', err);
            message.error('Failed to copy.');
        });
};

const TaskPage = () => {
    const [tasks, setTasks] = useState([]);
    const [userTaskHistory, setUserTaskHistory] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isSubmissionModalVisible, setIsSubmissionModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [submissionInput, setSubmissionInput] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    // --- STATE FOR TOP UP / CASHOUT ---
    const [profile, setProfile] = useState(null);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showCashoutModal, setShowCashoutModal] = useState(false);
    const [cashoutForm] = Form.useForm();
    const [cashoutLoading, setCashoutLoading] = useState(false);

    const userFriendlyAddress = useTonAddress();
    const rawAddress = useTonAddress(false);
    const [tonConnectUI] = useTonConnectUI();
    const navigate = useNavigate();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    // --- FETCH USER DATA ---
    const fetchUserData = useCallback(async () => {
        if (rawAddress) {
            setLoadingTasks(true);
            try {
                const profileRes = await getUserProfile(rawAddress);
                setProfile(profileRes.data);
            } catch (error) {
                console.error("Error fetching user data for Task Page:", error);
                message.error("Could not load user data.");
            } finally {
                setLoadingTasks(false);
            }
        } else {
            setProfile(null);
        }
    }, [rawAddress]);

    const fetchTasks = useCallback(async () => {
        setLoadingTasks(true);
        try {
            const response = await getActiveTasks(rawAddress || undefined);
            setTasks(response.data || []);
        } catch (error) {
            message.error("Failed to load tasks.");
        } finally {
            setLoadingTasks(false);
        }
    }, [rawAddress]);

    const fetchUserHistory = useCallback(async () => {
        if (!rawAddress) {
            setUserTaskHistory([]);
            return;
        }
        setLoadingHistory(true);
        try {
            const response = await getUserTaskHistory(rawAddress);
            setUserTaskHistory(response.data || []);
        } catch (error) {
            message.error("Failed to load your task history.");
        } finally {
            setLoadingHistory(false);
        }
    }, [rawAddress]);

    useEffect(() => {
        fetchTasks();
        fetchUserData();
        if (userFriendlyAddress) {
            fetchUserHistory();
        } else {
            setUserTaskHistory([]);
        }
    }, [userFriendlyAddress, fetchTasks, fetchUserHistory, fetchUserData]);

    const handleRefreshAll = () => {
        fetchTasks();
        fetchUserData();
        if (userFriendlyAddress) {
            fetchUserHistory();
        } else {
            message.info("Connect wallet to see your task history.")
        }
    }

    const handleTaskAction = (task) => {
        if (!userFriendlyAddress) {
            message.warn("Please connect your wallet to participate in tasks.");
            tonConnectUI.openModal();
            return;
        }
        setSelectedTask(task);
        if (task.validation_type === 'link_submission' || task.validation_type === 'text_submission') {
            setIsSubmissionModalVisible(true);
        } else if (task.validation_type === 'auto_approve') {
            handleModalSubmit();
        } else if (task.action_url) {
            window.open(task.action_url, '_blank');
            setIsSubmissionModalVisible(true);
        } else {
             setIsSubmissionModalVisible(true);
        }
    };

    const handleModalSubmit = async () => {
        if (!selectedTask || !rawAddress) return;

        setSubmitLoading(true);
        const loadingMessageKey = 'taskSubmit';
        message.loading({ content: `Submitting task '${selectedTask.title}'...`, key: loadingMessageKey, duration: 0});

        let submissionPayload = {};
        if (selectedTask.validation_type === 'link_submission') {
            if (!submissionInput || !(submissionInput.startsWith('http://') || submissionInput.startsWith('https://'))) {
                message.error({ content: 'Please enter a valid link (http:// or https://).', key: loadingMessageKey, duration: 3 });
                setSubmitLoading(false);
                return;
            }
            submissionPayload = { link: submissionInput };
        } else if (selectedTask.validation_type === 'text_submission') {
             submissionPayload = { text: submissionInput };
        }

        try {
            const response = await submitTaskCompletion(selectedTask.task_id, {
                userWalletAddress: rawAddress,
                submissionData: Object.keys(submissionPayload).length > 0 ? submissionPayload : null,
            });
            message.success({ content: response.data.message || 'Task submitted successfully!', key: loadingMessageKey, duration: 4 });
            setIsSubmissionModalVisible(false);
            setSubmissionInput('');
            setSelectedTask(null);
            fetchTasks();
            fetchUserHistory();
            fetchUserData();
        } catch (error) {
            message.error({ content: error?.response?.data?.message || 'Task submission failed.', key: loadingMessageKey, duration: 4 });
        } finally {
            setSubmitLoading(false);
        }
    };

    // --- CASHOUT HANDLER ---
    const handleCashout = async (values) => {
        const { amount } = values;
        if (parseFloat(amount) > parseFloat(profile?.balance || 0)) {
            message.error("Withdrawal amount cannot exceed your balance.");
            return;
        }
        setCashoutLoading(true);
        try {
            await withdrawArix({
                userWalletAddress: rawAddress,
                amount: parseFloat(amount),
                recipientAddress: userFriendlyAddress
            });
            message.success('Withdrawal initiated successfully!');
            await fetchUserData();
            setShowCashoutModal(false);
            cashoutForm.resetFields();
        } catch (error) {
            message.error(error.response?.data?.error || "An error occurred during withdrawal.");
        } finally {
            setCashoutLoading(false);
        }
    };

    const getTaskStatusTag = (task) => {
        const statusText = task.user_status?.replace(/_/g, ' ').toUpperCase();
        if (task.user_status === 'completed' || task.user_status === 'reward_credited') {
            return <Tag icon={<CheckCircleOutlined />} color="success">{statusText}</Tag>;
        }
        if (task.user_status === 'pending_verification' || task.user_status === 'approved') {
            return <Tag icon={<ClockCircleOutlined />} color="processing">{statusText}</Tag>;
        }
        if (task.user_status === 'rejected') {
            return <Tag icon={<ExclamationCircleOutlined />} color="error">{statusText}</Tag>;
        }
        return null;
    };

    const getHistoryStatusTag = (status) => {
        const statusText = status?.replace(/_/g, ' ').toUpperCase();
        if (status === 'reward_credited' || status === 'completed') return <Tag color="success">{statusText}</Tag>;
        if (status === 'approved') return <Tag color="blue">{statusText}</Tag>;
        if (status === 'pending_verification') return <Tag color="gold">{statusText}</Tag>;
        if (status === 'rejected') return <Tag color="error">{statusText}</Tag>;
        return <Tag>{statusText}</Tag>;
    };

    const renderTaskItem = (task) => (
        <List.Item className="task-list-item">
            <Card
                className="dark-theme-card"
                title={<Text className="text-primary-light" style={{fontWeight: '600', fontSize:'1.05rem'}}>{task.title}</Text>}
                extra={getTaskStatusTag(task)}
                style={{height: '100%', display: 'flex', flexDirection: 'column'}}
            >
                <div style={{flexGrow: 1}}>
                    <Paragraph className="task-description">{task.description}</Paragraph>
                </div>
                <Row justify="space-between" align="middle" style={{marginTop: 'auto', paddingTop: 12}}>
                    <Col>
                        <Text strong className="task-reward-text">
                            Reward: {parseFloat(task.reward_arix_amount).toFixed(ARIX_DECIMALS)} ARIX
                        </Text>
                    </Col>
                    <Col>
                        {task.can_attempt ? (
                            <Button
                                type="primary"
                                className="task-action-button"
                                icon={task.action_url && task.validation_type !== 'auto_approve' ? <LinkOutlined /> : <SendOutlined />}
                                onClick={() => handleTaskAction(task)}
                                disabled={!userFriendlyAddress}
                                size="middle"
                            >
                                {task.validation_type === 'auto_approve' && !task.action_url ? 'Claim' :
                                (task.action_url && (task.validation_type === 'auto_approve' || !task.validation_type.includes('submission')) ? 'Visit & Claim' :
                                (task.action_url ? 'Go to Task' : 'Submit Proof'))}
                            </Button>
                        ) : (
                            <Button disabled type="dashed" size="middle" className="task-disabled-button">
                                {(task.user_status === 'pending_verification' || task.user_status === 'approved') ? 'Pending' : 'Completed'}
                            </Button>
                        )}
                    </Col>
                </Row>
                 {task.action_url && task.can_attempt && task.validation_type !== 'auto_approve' && (
                     <Text className="task-sub-note">
                         Perform action at link, then confirm or submit proof.
                     </Text>
                 )}
            </Card>
        </List.Item>
    );

    const renderHistoryItem = (item) => (
        <List.Item className="history-list-item">
             <Card size="small" className="dark-theme-card">
                <Row justify="space-between" align="top" gutter={[8,4]}>
                    <Col xs={24} sm={16}>
                        <Text strong className="task-title-history">{item.title}</Text>
                        <Paragraph className="submission-date">
                            Submitted: {new Date(item.completed_at).toLocaleString()}
                        </Paragraph>
                        {item.submission_data?.link && <Text className="submission-details-text">Link: <a href={item.submission_data.link} target="_blank" rel="noopener noreferrer">{item.submission_data.link.substring(0,isMobile? 25 : 40)}...</a></Text>}
                        {item.submission_data?.text && <Text className="submission-details-text">Details: {item.submission_data.text.substring(0,isMobile ? 30 : 50)}...</Text>}
                    </Col>
                    <Col xs={24} sm={8} style={{textAlign: isMobile ? 'left' : 'right', marginTop: isMobile ? 8 : 0}}>
                        {getHistoryStatusTag(item.status)}
                        <Text block className="reward-history-text" style={{ marginTop: 4}}>
                            + {parseFloat(item.reward_arix_amount).toFixed(ARIX_DECIMALS)} ARIX
                        </Text>
                    </Col>
                </Row>
                {item.notes && <Paragraph className="notes-history-text" style={{ marginTop: 5}}>Note: {item.notes}</Paragraph>}
            </Card>
        </List.Item>
    );

    return (
        <div className="task-page-container">
            {/* HEADER SECTION */}
            <div className="page-header-section">
                <div className="balance-display-box">
                    <div className="balance-amount-line">
                        <div className="balance-icon-wrapper">
                            <span className="balance-icon-representation">♢</span>
                        </div>
                        <Text className="balance-amount-value">
                            {loadingTasks ? <Spin size="small"/> : parseFloat(profile?.balance || 0).toFixed(2)}
                        </Text>
                    </div>
                    <Text className="balance-currency-label">ARIX In-App Balance</Text>
                </div>
                <div className="topup-cashout-buttons">
                    <Button icon={<ArrowDownOutlined />} onClick={() => setShowTopUpModal(true)}>Top up</Button>
                    <Button icon={<ArrowUpOutlined />} onClick={() => setShowCashoutModal(true)}>Cashout</Button>
                </div>
                <div className="page-banner" onClick={() => navigate('/game')}>
                    <Text className="page-banner-text">X2 or maybe x256? Play Coinflip and try your luck! →</Text>
                </div>
            </div>

            <Title level={2} className="task-page-title">ARIX Tasks</Title>

            {!userFriendlyAddress && !loadingTasks && (
                 <Alert
                    message="Connect Wallet to Participate"
                    description="Please connect your TON wallet to view personalized task statuses, submit tasks, and claim ARIX rewards."
                    type="info"
                    showIcon
                    style={{marginBottom: 24, marginLeft: isMobile ? 0 : 0, marginRight: isMobile ? 0: 0}}
                    action={
                        <Button size="small" type="primary" onClick={() => tonConnectUI.openModal()}>
                            Connect Wallet
                        </Button>
                    }
                />
            )}

            <div style={{textAlign:'right', marginBottom: loadingTasks && tasks.length === 0 ? 0 : 20, paddingRight: isMobile? 0:0 }}>
                <Button icon={<RedoOutlined/>} onClick={handleRefreshAll} loading={loadingTasks || loadingHistory}>Refresh Tasks</Button>
            </div>

            {loadingTasks && tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" tip="Loading Available Tasks..." /></div>
            ) : tasks.length > 0 ? (
                <List
                    grid={{ gutter: isMobile ? 16 : 24, xs: 1, sm: 1, md: 2, lg:2, xl:3 }}
                    dataSource={tasks}
                    renderItem={renderTaskItem}
                    style={{padding: isMobile? '0' : '0'}}
                />
            ) : (
                !loadingTasks && <Card className="dark-theme-card" style={{textAlign:'center', padding: '30px', margin: isMobile ? '0' : '0'}}><Empty description={<Text className="text-secondary-light">No active tasks available. Check back soon!</Text>} /></Card>
            )}

            {userFriendlyAddress && (userTaskHistory.length > 0 || loadingHistory) && (
                <div style={{marginTop: 40, padding: isMobile? '0' : '0'}}>
                    <Title level={3} className="section-title" style={{textAlign: 'center', marginBottom: 24}}>Your Task History</Title>
                    {loadingHistory ? (
                        <div style={{ textAlign: 'center', padding: 30 }}><Spin tip="Loading your history..." /></div>
                    ) : userTaskHistory.length > 0 ? (
                         <List
                            dataSource={userTaskHistory}
                            renderItem={renderHistoryItem}
                        />
                    ) : (
                        <Card className="dark-theme-card" style={{textAlign:'center', padding: '20px'}}><Empty description={<Text className="text-secondary-light">You haven't completed any tasks yet.</Text>} /></Card>
                    )}
                </div>
            )}

            {/* TASK SUBMISSION MODAL */}
            <Modal
                title={<Text className="task-modal-title">Submit Task: {selectedTask?.title}</Text>}
                open={isSubmissionModalVisible}
                onOk={handleModalSubmit}
                onCancel={() => { setIsSubmissionModalVisible(false); setSubmissionInput(''); setSelectedTask(null); }}
                confirmLoading={submitLoading}
                okText="Submit"
                destroyOnClose
            >
                {selectedTask && (
                    <>
                        <Paragraph className="task-modal-text">{selectedTask.description}</Paragraph>
                        <Paragraph strong className="task-modal-reward">Reward: {parseFloat(selectedTask.reward_arix_amount).toFixed(ARIX_DECIMALS)} ARIX</Paragraph>

                        {selectedTask.validation_type === 'link_submission' && (
                            <Input
                                prefix={<LinkOutlined />}
                                placeholder="Paste your submission link here (e.g., post URL)"
                                value={submissionInput}
                                onChange={(e) => setSubmissionInput(e.target.value)}
                                style={{marginTop: 12}}
                            />
                        )}
                        {selectedTask.validation_type === 'text_submission' && (
                            <TextArea
                                rows={3}
                                placeholder="Enter your submission details here"
                                value={submissionInput}
                                onChange={(e) => setSubmissionInput(e.target.value)}
                                style={{marginTop: 12}}
                            />
                        )}
                        {(selectedTask.validation_type === 'auto_approve' || (selectedTask.action_url && !(selectedTask.validation_type === 'link_submission' || selectedTask.validation_type === 'text_submission'))) && (
                             <Paragraph className="task-modal-text" style={{marginTop:12, fontSize:'0.9rem', opacity:0.7}}>
                                {selectedTask.action_url ?
                                 `Please ensure you have completed the action at the provided link.` :
                                 `This task will be automatically processed.`}
                                {selectedTask.action_url && <div className="task-modal-url"><Text className="text-secondary-light">Task URL:</Text> <a href={selectedTask.action_url} target="_blank" rel="noopener noreferrer"> {selectedTask.action_url}</a></div>}
                                <br/>Click "Submit" to confirm your completion.
                             </Paragraph>
                        )}
                    </>
                )}
            </Modal>

            {/* TOP UP MODAL */}
            <Modal 
                open={showTopUpModal} 
                onCancel={() => setShowTopUpModal(false)} 
                footer={null} 
                className="push-topup-modal" 
                centered
            >
                <div className="push-topup-content">
                    <Button 
                        shape="circle" 
                        icon={<CloseOutlined />} 
                        className="close-topup-button" 
                        onClick={() => setShowTopUpModal(false)} 
                    />
                    <div className="topup-modal-header">
                        <ArixPushIcon />
                        <Text className="topup-modal-title">Top Up Balance</Text>
                    </div>
                    <Alert message="Send only ARIX to this address" type="warning" showIcon />
                    <Paragraph className="address-label" style={{marginTop: '16px'}}>
                        1. DEPOSIT ADDRESS
                    </Paragraph>
                    <div className="address-display-box">
                        <Text 
                            className="deposit-address-text" 
                            ellipsis={{ tooltip: HOT_WALLET_ADDRESS }}
                        >
                            {HOT_WALLET_ADDRESS}
                        </Text>
                        <Button 
                            icon={<CopyOutlined />} 
                            onClick={() => copyToClipboard(HOT_WALLET_ADDRESS)} 
                        />
                    </div>
                    <Paragraph className="address-label" style={{ marginTop: '16px' }}>
                        2. REQUIRED MEMO / COMMENT
                    </Paragraph>
                    <Alert 
                        message="YOUR WALLET ADDRESS IS THE MEMO" 
                        description="You MUST put your personal wallet address in the transaction's memo/comment field to be credited." 
                        type="error" 
                        showIcon 
                    />
                    <div className="address-display-box">
                        <Text 
                            className="deposit-address-text" 
                            ellipsis={{ tooltip: userFriendlyAddress }}
                        >
                            {userFriendlyAddress || "Connect wallet to see your address"}
                        </Text>
                        <Button 
                            icon={<CopyOutlined />} 
                            onClick={() => copyToClipboard(userFriendlyAddress)} 
                        />
                    </div>
                </div>
            </Modal>

            {/* CASHOUT MODAL */}
            <Modal 
                open={showCashoutModal} 
                onCancel={() => setShowCashoutModal(false)} 
                footer={null} 
                className="push-cashout-modal" 
                centered
            >
                <div className="push-cashout-content">
                    <Button 
                        shape="circle" 
                        icon={<CloseOutlined />} 
                        className="close-cashout-button" 
                        onClick={() => setShowCashoutModal(false)} 
                    />
                    <div className="cashout-modal-header">
                        <ArixPushIcon />
                        <Text className="cashout-modal-title">Cashout Balance</Text>
                    </div>
                    <div className='cashout-balance-info'>
                        <Text>Available to withdraw:</Text>
                        <Text strong>
                            {loadingTasks ? <Spin size="small" /> : `${parseFloat(profile?.balance || 0).toFixed(2)} ARIX`}
                        </Text>
                    </div>
                    <Form 
                        form={cashoutForm} 
                        onFinish={handleCashout} 
                        layout="vertical" 
                        disabled={cashoutLoading}
                    >
                        <Form.Item 
                            name="amount" 
                            label="Amount to Withdraw" 
                            rules={[
                                { required: true, message: 'Please input an amount!' }, 
                                { 
                                    validator: (_, value) => 
                                        (!value || parseFloat(value) <= 0) ? 
                                        Promise.reject(new Error('Amount must be positive')) : 
                                        (profile && parseFloat(value) > parseFloat(profile.balance)) ? 
                                        Promise.reject(new Error('Amount exceeds balance')) : 
                                        Promise.resolve() 
                                }
                            ]}
                        >
                            <Input type="number" placeholder="e.g., 100" />
                        </Form.Item>
                        <Form.Item label="Withdrawal Address">
                            <Input value={userFriendlyAddress} disabled />
                        </Form.Item>
                        <Form.Item>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                loading={cashoutLoading}
                            >
                                Withdraw ARIX
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default TaskPage;