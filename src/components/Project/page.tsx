"use client";
import Content from "@/components/shared/Content";
import { AppDispatch } from "@/store";
import { Badge, Table, TableColumnsType } from "antd";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { deleteProjects, getProject } from "@/store/actions/file.action";
import { Button, Popconfirm, TableProps, Tooltip } from "antd/lib";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FolderOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import styles from "./Project.module.scss";
import { SorterResult } from "antd/es/table/interface";
import FormProject from "../ModalForm/FormProject/FormProject";
import { errorToast, successToast } from "@/helpers/toast";
import FormUserProjPage from "../ModalForm/FormUserProjPage/page";
import { getUserOutSide } from "@/store/actions/user.action";
import FormUpload from "../ModalForm/FormUpload/page";
import { getAllProjectUploadFiles } from "@/store/actions/upload.action";
import { FileTypeLabel } from "@/constants/enums";
type TableChange = TableProps<any>["onChange"];
type Sorter = SorterResult<any>;

function Project() {
  const dispatch = useDispatch<AppDispatch>();
  const [pagination, setPagination] = useState({ pageNumber: 1, pageSize: 10 });
  const [dataProject, setDataProject] = useState<any[]>([]);
  const [sortedInfo, setSortedInfo] = useState<SorterResult<any>>({});
  const [currentFilters, setCurrentFilters] = useState<
    { key: string; value: string[] }[]
  >([]);
  const [filterOptions, setFilterOptions] = useState<{
    createdOn: any[];
    createdBy: any[];
  }>({
    createdOn: [],
    createdBy: [],
  });
  const [searchValue, setSearchValue] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenUserPage, setIsModalOpenUserPage] = useState(false);
  const [dataTableRight, setDataTableRight] = useState([]);
  const [dataTableLeft, setDataTableLeft] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [roles, setRoles] = useState<string[]>([]);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editData, setEditData] = useState<any>(null);
  const isNormalUser = roles.includes("normal");
  const [isOpenFolder, setIsOpenFolder] = useState(false);
  const [dataUploaded, setDataUploaded] = useState<any[]>([]);
 
  useEffect(() => {
    const userStr =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const user = userStr ? JSON.parse(userStr) : null;
    if (user && user.roles) {
      setRoles(user.roles);
    }
  }, []);

  const handleCancel = () => setIsModalOpen(false);
  const showModal = () => {
    setMode("create");
    setEditData(null);
    setIsModalOpen(true);
  };

  const fetchData = (
    sorter: any = sortedInfo,
    filters = currentFilters,
    page = pagination
  ) => {
    const payload = {
      search: searchValue,
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      sorts: sorter?.columnKey
        ? [{ key: sorter.columnKey, sort: sorter.order === "ascend" ? 1 : -1 }]
        : [],
      filters: filters || [],
    };

    dispatch(getProject(payload))
      .unwrap()
      .then((res: any) => {
        const items = res.result.items;
        console.log("items", items);
        const mapData = items.map((item: any) => ({
          ...item,
          key: item.id,
          createdOn: formatDate(item.createdOn),
        }));
        setDataProject(mapData);

        if (
          filterOptions.createdOn.length === 0 ||
          filterOptions.createdBy.length === 0
        ) {
          const uniqueDates = [
            ...new Set(items.map((i: any) => formatDate(i.createdOn))),
          ];
          const uniqueAuthors = Array.from(
            new Map(
              items.map((i: any) => [i.createdById, i.createdBy])
            ).entries()
          );
          setFilterOptions((prev) => ({
            ...prev,
            createdOn:
              prev.createdOn.length === 0
                ? uniqueDates.map((d) => ({ text: d, value: d }))
                : prev.createdOn,
            createdBy:
              prev.createdBy.length === 0
                ? uniqueAuthors.map(([id, name]) => ({ text: name, value: id }))
                : prev.createdBy,
          }));
        }
      });
  };

  const fetchUploaded = async (
    projectId: string
  ) => {
    try {
      const payload = {
        search: searchValue,
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
        sorts: sortedInfo?.columnKey
          ? [
              {
                key: String(sortedInfo.columnKey),
                sort: sortedInfo.order === "ascend" ? 1 : -1,
              },
            ]
          : [],
        filters: currentFilters || [],
      };
      const data = await dispatch(
        getAllProjectUploadFiles({
          projectId: projectId,
          body: payload,
        })
      ).unwrap();
      const convertData = data.result.items.map((item: any) => ({
        ...item,
        key: item.id,
        typeLabel: FileTypeLabel[item.type] || "Unknown",
        sizeWithUnit: `${item.size} MB`,
        createdOn: formatDate(item.createdOn),
      }));
      setDataUploaded(convertData)
    } catch (error) {
      console.error("Lỗi: ", error);
    }
  };

  const fetchUserOutSide = async (projectId: string) => {
    try {
      const data = await dispatch(getUserOutSide({ id: projectId })).unwrap();
      const formattedLeft = data.result.userAddedView.items.map(
        (item: any) => ({
          ...item,
          createdOn: formatDate(item.createdOn),
        })
      );

      setDataTableRight(data.result.userAddView.items);
      setDataTableLeft(formattedLeft);

      console.log("dataLeft", formattedLeft);
    } catch (error) {
      console.error("Lỗi khi lấy user ngoài project:", error);
    }
  };

  const handleUserProjPage = (id: string) => {
    setIsModalOpenUserPage(true);
    setSelectedProjectId(id);
    fetchUserOutSide(id);
  };

  const handleFolder = (id: string) => {
    setIsOpenFolder(true);
    fetchUploaded(id);
     setSelectedProjectId(id);
  };

  const handleCancelUserProjPage = () => {
    setIsModalOpenUserPage(false);
    fetchData();
  };

  const handleCancelUpload = () => {
    setIsOpenFolder(false);
    // fetchData();
  };

  const formatDate = (dateStr: any) => {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  };

  useEffect(() => {
    fetchData();
  }, [dispatch, searchValue]);

  const handleDelete = async (id: any) => {
    console.log("iddd", id);
    await dispatch(deleteProjects(id))
      .unwrap()
      .then(() => {
        successToast("Delete Sucessfully");
      })
      .catch((err: any) => {
        errorToast(err[0]);
      })
      .finally(() => {
        handleCancel();
        fetchData();
      });
  };

  const handleEdit = (record: any) => {
    console.log("dataRecord", record);
    setMode("edit");
    setEditData(record);
    setIsModalOpen(true);
  };

  const onChange: TableChange = (paginationTable, filters, sorter) => {
    const transformedFilters = Object.entries(filters)
      .filter(([_, value]) => Array.isArray(value) && value.length > 0)
      .map(([key, value]) => ({
        key,
        value: value as string[],
      }));

    setCurrentFilters(transformedFilters);
    setSortedInfo(sorter as Sorter);

    const newPagination = {
      pageNumber: paginationTable.current || 1,
      pageSize: paginationTable.pageSize || 10,
    };

    setPagination(newPagination);
    fetchData(sorter as Sorter, transformedFilters, newPagination);
  };

  const columns: TableColumnsType<any> = [
    {
      title: "Project No.",
      showSorterTooltip: false,
      dataIndex: "no",
      key: "no",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "no" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Project name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "name" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Explanation",
      dataIndex: "description",
      key: "description",
      sorter: true,
      sortOrder:
        sortedInfo.columnKey === "description" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "client" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Team",
      dataIndex: "team",
      key: "team",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "team" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Manager",
      dataIndex: "manager",
      key: "manager",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "manager" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Created date",
      dataIndex: "createdOn",
      key: "createdOn",
      sorter: true,
      filters: filterOptions.createdOn,
      sortOrder: sortedInfo.columnKey === "createdOn" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Author",
      dataIndex: "createdBy",
      key: "createdById",
      sorter: true,
      filters: filterOptions.createdBy,
      sortOrder: sortedInfo.columnKey === "createdBy" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Size",
      dataIndex: "totalUsed",
      key: "totalUsed",
      sorter: true,
      sortOrder: sortedInfo.columnKey === "totalUsed" ? sortedInfo.order : null,
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span className={styles.largeText}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: "Action",
      render: (_: any, record: any) => (
        <>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button className={styles.btnIcon}>
              <EyeOutlined />
            </Button>
            {!isNormalUser && (
              <>
                <Badge
                  count={record.totalUsers}
                  offset={[-5, 5]}
                  color="#00A8FF"
                >
                  <Button
                    className={styles.btnIcon}
                    icon={<UsergroupAddOutlined />}
                    onClick={() => handleUserProjPage(record.id)}
                  ></Button>
                </Badge>
                <Button
                  className={styles.btnIcon}
                  onClick={() => handleFolder(record.id)}
                >
                  <FolderOutlined />
                </Button>
                <Button
                  className={styles.btnIcon}
                  onClick={() => handleEdit(record)}
                >
                  <EditOutlined />
                </Button>
                <Popconfirm
                  title="Do you want to delete this project?"
                  okText="OK"
                  cancelText="Cancel"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button
                    className={styles.btnIcon}
                    style={{
                      border: "1px solid red",
                      color: "red",
                    }}
                    danger
                  >
                    <DeleteOutlined />
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        </>
      ),
    },
  ];

  return (
    <div>
      <Content
        title="Project"
        titleForm="Project Creation"
        buttonTitle="+ Project Creation"
        handleOpen={showModal}
        handleCancel={handleCancel}
        isOpen={isModalOpen}
        onSearchChange={(val) => {
          setSearchValue(val);
        }}
      >
        <FormProject
          isOpen={isModalOpen}
          fetchData={fetchData}
          setIsModalOpen={setIsModalOpen}
          mode={mode}
          editData={editData}
          projectId={selectedProjectId}
        />
      </Content>

      <Table
        scroll={{ x: "max-content" }}
        columns={columns}
        dataSource={dataProject}
        onChange={onChange}
        pagination={{
          current: pagination.pageNumber,
          pageSize: pagination.pageSize,
        }}
        size="small"
      />

      <FormUserProjPage
        projectId={selectedProjectId}
        isModalOpenUserPage={isModalOpenUserPage}
        isCancel={handleCancelUserProjPage}
        setIsModalOpenUserPage={setIsModalOpenUserPage}
        dataTableRight={dataTableRight}
        dataTableLeft={dataTableLeft}
        fetchUserOutSide={fetchUserOutSide}
      />

      <FormUpload 
      projectId={selectedProjectId}
      open={isOpenFolder} handleCancelUpload={handleCancelUpload} dataUploaded={dataUploaded}/>
    </div>
  );
}

export default Project;
